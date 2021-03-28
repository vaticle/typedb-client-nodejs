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

import {ThingImpl} from "./ThingImpl";
import {Relation, RemoteRelation} from "../../api/concept/thing/Relation";
import {Thing as ThingProto} from "grakn-protocol/common/concept_pb";
import {RelationType} from "../../api/concept/type/RelationType";
import {GraknTransaction} from "../../api/GraknTransaction";
import {Bytes} from "../../dependencies_internal";
import {RelationTypeImpl} from "../type/RelationTypeImpl";
import {RoleType} from "../../api/concept/type/RoleType";
import {Thing} from "../../api/concept/thing/Thing";
import {Stream} from "../../common/util/Stream";
import {Core} from "../../common/rpc/RequestBuilder";
import {RoleTypeImpl} from "../type/RoleTypeImpl";

export class RelationImpl extends ThingImpl implements Relation {

    private _type: RelationType;

    constructor(iid: string, type: RelationType) {
        super(iid);
        this._type = type;
    }

    asRemote(transaction: GraknTransaction): RemoteRelation {
        return new RelationImpl.RemoteImpl((transaction as GraknTransaction.Extended), this.getIID(), this.getType());
    }

    getType(): RelationType {
        return this._type;
    }

}

export namespace RelationImpl {

    export function of(thingProto: ThingProto) {
        let iid = Bytes.bytesToHexString(thingProto.getIid_asU8());
        return new RelationImpl(iid, RelationTypeImpl.of(thingProto.getType()));
    }

    export class RemoteImpl extends ThingImpl.RemoteImpl implements RemoteRelation {

        private _type: RelationType;

        constructor(transaction: GraknTransaction.Extended, iid: string, type: RelationType) {
            super(transaction, iid);
            this._type = type;
        }

        asRemote(transaction: GraknTransaction): RemoteRelation {
            return this;
        }

        getType(): RelationType {
            return this._type;
        }

        async addPlayer(roleType: RoleType, player: Thing): Promise<void> {
            const request = Core.Thing.Relation.addPlayerReq(this.getIID(), player.proto(), player.proto());
            await this.execute(request);
        }

        getPlayers(roleTypes?: RoleType[]): Stream<Thing> {
            if (!roleTypes) roleTypes = []
            const roleTypesProtos = roleTypes.map((roleType) => roleType.proto());
            const request = Core.Thing.Relation.getPlayersReq(this.getIID(), roleTypesProtos);
            return this.stream(request)
                .flatMap((resPart) => Stream.array(resPart.getRelationGetPlayersResPart().getThingsList()))
                .map((roleTypeProto) => RoleTypeImpl.of(roleTypeProto));
        }

        async getPlayersByRoleType(): Promise<Map<RoleType, Thing[]>> {
            const request = Core.Thing.Relation.getPlayersByRoleTypeReq(this.getIID());
            const rolePlayersMap = new Map<RoleType, Thing[]>();
            await this.stream(request)
                .flatMap((resPart) => Stream.array(resPart.getRelationGetPlayersByRoleTypeResPart().getRoleTypesWithPlayersList()))
                .forEach((roleTypeWithPlayerList) => {
                    const role = RoleTypeImpl.of(roleTypeWithPlayerList.getRoleType());
                    const player = ThingImpl.of(roleTypeWithPlayerList.getPlayer());
                    let key = this.findRole(rolePlayersMap, role);
                    if (key == null) {
                        rolePlayersMap.set(role, []);
                        key = role;
                    }
                    rolePlayersMap.get(key).push(player);
                })
            return rolePlayersMap;
        }

        private findRole(map: Map<RoleType, Thing[]>, role: RoleType) {
            let iter = map.keys();
            let next = iter.next();
            while (!next.done) {
                const roleType = next.value;
                if (roleType.label().scopedName() === role.getLabel().scopedName()) {
                    return roleType;
                }
                next = iter.next();
            }
            return null;
        }

        async removePlayer(roleType: RoleType, player: Thing): Promise<void> {
            const request = Core.Thing.Relation.removePlayerReq(this.getIID(), roleType.proto(), player.proto());
            await this.execute(request);
        }

    }

}