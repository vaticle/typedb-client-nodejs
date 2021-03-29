/*
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

import {Session} from "grakn-protocol/common/session_pb";
import {GraknOptions} from "./GraknOptions";
import {GraknTransaction} from "./GraknTransaction";
import {Database} from "./database/Database";

export interface GraknSession {

    isOpen() : boolean;

    type() : GraknSession.Type;

    database(): Database;

    options() : GraknOptions;

    transaction(type : GraknTransaction.Type, options? : GraknOptions) : Promise<GraknTransaction>;

    close() : void;

}

export namespace GraknSession {

    export interface Type {
        proto(): Session.Type;
        isData(): boolean;
        isSchema(): boolean;
    }

    export namespace Type {

        class Impl implements Type {

            private _type: Session.Type;

            constructor(type: Session.Type) {
                this._type = type;
            }

            proto(): Session.Type {
                return this._type;
            }

            isData(): boolean {
                return this == DATA;
            }

            isSchema(): boolean {
                return this == SCHEMA;
            }

        }

        export const DATA = new Impl(Session.Type.DATA);
        export const SCHEMA = new Impl(Session.Type.SCHEMA);
    }
}


