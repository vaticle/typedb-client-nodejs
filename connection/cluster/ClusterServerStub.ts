/*
 * Copyright (C) 2022 Vaticle
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
    CallCredentials,
    ChannelCredentials,
    credentials,
    Metadata,
    ServiceError
} from "@grpc/grpc-js";
import * as fs from "fs";
import {TypeDBCredential} from "../../api/connection/TypeDBCredential";
import {TypeDBClientError} from "../../common/errors/TypeDBClientError";
import {TypeDBStub} from "../../common/rpc/TypeDBStub";
import {RequestBuilder} from "../../common/rpc/RequestBuilder";
import {ErrorMessage} from "../../common/errors/ErrorMessage";
import CLUSTER_TOKEN_CREDENTIAL_INVALID = ErrorMessage.Client.CLUSTER_TOKEN_CREDENTIAL_INVALID;
import {
    UserManagerAllReq,
    UserManagerAllRes,
    UserManagerContainsReq,
    UserManagerCreateReq,
    UserManagerDeleteReq,
    UserManagerGetReq,
    UserManagerGetRes,
    UserManagerPasswordSetReq,
    UserPasswordUpdateReq,
    UserTokenReq
} from "typedb-protocol/proto/user";
import {TypeDBClient as GRPCStub} from "typedb-protocol/proto/service";

function isServiceError(e: any): e is ServiceError {
    return "code" in e;
}

export class ClusterServerStub extends TypeDBStub {
    private readonly _credential: TypeDBCredential;
    private _token: string;
    private readonly _stub: GRPCStub;

    constructor(address: string, credential: TypeDBCredential) {
        super();
        this._credential = credential;
        this._token = null;
        const stubCredentials = this.createChannelCredentials();
        this._stub = new GRPCStub(address, stubCredentials);
    }

    public async open(): Promise<void> {
        try {
            await this.connectionOpen(RequestBuilder.Connection.openReq());
            const req = RequestBuilder.User.tokenReq(this._credential.username);
            this._token = await this.userToken(req);
        } catch (e) {
            if (!isServiceError(e)) throw e;
        }
    }

    private createChannelCredentials(): ChannelCredentials {
        const callCreds = this.createCallCredentials();
        if (this._credential.tlsRootCAPath != null) {
            const rootCert = fs.readFileSync(this._credential.tlsRootCAPath);
            return credentials.combineChannelCredentials(ChannelCredentials.createSsl(rootCert), callCreds);
        } else {
            return credentials.combineChannelCredentials(ChannelCredentials.createSsl(), callCreds);
        }
    }

    private createCallCredentials(): CallCredentials {
        const metaCallback = (_params: any, callback: any) => {
            const metadata = new Metadata();
            metadata.add('username', this._credential.username);
            if (this._token == null) {
                metadata.add('password', this._credential.password);
            } else {
                metadata.add('token', this._token);
            }
            callback(null, metadata);
        }
        return CallCredentials.createFromMetadataGenerator(metaCallback);
    }

    usersAll(req: UserManagerAllReq): Promise<UserManagerAllRes> {
        return this.mayRenewToken(() =>
            new Promise<UserManagerAllRes>((resolve, reject) => {
                this._stub.users_all(req, (err, res) => {
                    if (err) reject(new TypeDBClientError(err));
                    else resolve(res);
                });
            })
        );
    }

    usersContains(req: UserManagerContainsReq): Promise<boolean> {
        return this.mayRenewToken(() =>
            new Promise<boolean>((resolve, reject) => {
                this._stub.users_contains(req, (err, res) => {
                    if (err) reject(new TypeDBClientError(err));
                    else resolve(res.contains);
                })
            })
        );
    }

    usersCreate(req: UserManagerCreateReq): Promise<void> {
        return this.mayRenewToken(() =>
            new Promise<void>((resolve, reject) => {
                this._stub.users_create(req, (err, res) => {
                    if (err) reject(new TypeDBClientError(err));
                    else resolve();
                })
            })
        );
    }

    usersDelete(req: UserManagerDeleteReq): Promise<void> {
        return this.mayRenewToken(() =>
            new Promise<void>((resolve, reject) => {
                this._stub.users_delete(req, (err, res) => {
                    if (err) reject(new TypeDBClientError(err));
                    else resolve();
                });
            })
        );
    }

    usersPasswordSet(req: UserManagerPasswordSetReq): Promise<void> {
        return this.mayRenewToken(() =>
            new Promise<void>((resolve, reject) => {
                this._stub.users_password_set(req, (err, res) => {
                    if (err) reject(new TypeDBClientError(err));
                    else resolve();
                })
            })
        );
    }

    usersGet(req: UserManagerGetReq): Promise<UserManagerGetRes> {
        return this.mayRenewToken(() =>
            new Promise<UserManagerGetRes>((resolve, reject) => {
                this._stub.users_get(req, (err, res) => {
                    if (err) reject(new TypeDBClientError(err));
                    else resolve(res);
                });
            })
        );
    }

    userPasswordUpdate(req: UserPasswordUpdateReq): Promise<void> {
        return this.mayRenewToken(() =>
            new Promise<void>((resolve, reject) => {
                this._stub.user_password_update(req, (err, res) => {
                    if (err) reject(new TypeDBClientError(err));
                    else resolve();
                })
            })
        );
    }

    async mayRenewToken<RES>(fn: () => Promise<RES>): Promise<RES> {
        try {
            return await fn();
        } catch (e) {
            if (e instanceof TypeDBClientError && CLUSTER_TOKEN_CREDENTIAL_INVALID === e.messageTemplate) {
                console.log(`token '${this._token}' expired. renewing...`);
                this._token = null;
                const req = RequestBuilder.User.tokenReq(this._credential.username);
                this._token = await this.userToken(req);
                console.log(`token renewed to '${this._token}'`);
                try {
                    return await fn();
                } catch (e2) {
                    if (isServiceError(e2)) {
                        throw new TypeDBClientError(e2);
                    } else throw e2;
                }
            } else throw e;
        }
    }

    private async userToken(req: UserTokenReq): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            return this.stub().user_token(req, (err, res) => {
                if (err) reject(err);
                else resolve(res.token);
            });
        });
    }

    stub(): GRPCStub {
        return this._stub;
    }
}
