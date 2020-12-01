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

import { ThingType } from "./Type/ThingType";
import { EntityType } from "./Type/EntityType";
import { RelationType } from "./Type/RelationType";
import { AttributeType } from "./Type/AttributeType";
import ConceptProto from "graknlabs-grpc-protocol/protobuf/concept_pb";
import TransactionProto from "graknlabs-grpc-protocol/protobuf/transaction_pb";
import { EntityTypeImpl } from "./Type/Impl/EntityTypeImpl";
import { Type } from "./Type/Type";
import { TypeImpl } from "./Type/Impl/TypeImpl";
import { Rule } from "./Schema/Rule";
import { RuleImpl } from "./Schema/Impl/RuleImpl";
import { RPCTransaction } from "../rpc/RPCTransaction";
import { RelationTypeImpl } from "./Type/Impl/RelationTypeImpl";
import { AttributeTypeImpl } from "./Type/Impl/AttributeTypeImpl";
import { Thing } from "./Thing/Thing";
import { ConceptProtoReader } from "./Proto/ConceptProtoReader";

export class ConceptManager {
    private readonly _rpcTransaction: RPCTransaction;

    constructor (rpcTransaction: RPCTransaction) {
        this._rpcTransaction = rpcTransaction;
    }

    async getRootThingType(): Promise<ThingType> {
        return await this.getType("thing") as ThingType;
    }

    async getRootEntityType(): Promise<EntityType> {
        return await this.getType("entity") as EntityType;
    }

    async getRootRelationType(): Promise<RelationType> {
        return await this.getType("relation") as RelationType;
    }

    async getRootAttributeType(): Promise<AttributeType> {
        return await this.getType("attribute") as AttributeType;
    }

    async putEntityType(label: string): Promise<EntityType> {
        const req = new ConceptProto.ConceptManager.Req()
            .setPutEntityTypeReq(new ConceptProto.ConceptManager.PutEntityType.Req().setLabel(label));
        const res = await this.execute(req);
        return EntityTypeImpl.of(res.getPutEntityTypeRes().getEntityType());
    }

    async getEntityType(label: string): Promise<EntityType> {
        const type = await this.getType(label);
        if (type instanceof EntityTypeImpl) return type as EntityType;
        else return null;
    }

    async putRelationType(label: string): Promise<RelationType> {
        const req = new ConceptProto.ConceptManager.Req()
            .setPutRelationTypeReq(new ConceptProto.ConceptManager.PutRelationType.Req().setLabel(label));
        const res = await this.execute(req);
        return RelationTypeImpl.of(res.getPutRelationTypeRes().getRelationType());
    }

    async getRelationType(label: string): Promise<RelationType> {
        const type = await this.getType(label);
        if (type instanceof RelationTypeImpl) return type as RelationType;
        else return null;
    }

    async putAttributeType(label: string): Promise<AttributeType> {
        const req = new ConceptProto.ConceptManager.Req()
            .setPutAttributeTypeReq(new ConceptProto.ConceptManager.PutAttributeType.Req().setLabel(label));
        const res = await this.execute(req);
        return ConceptProtoReader.attributeType(res.getPutAttributeTypeRes().getAttributeType());
    }

    async getAttributeType(label: string): Promise<AttributeType> {
        const type = await this.getType(label);
        if (type instanceof AttributeTypeImpl) return type as AttributeType;
        else return null;
    }

    async putRule(label: string, when: string, then: string): Promise<Rule> {
        const req = new ConceptProto.ConceptManager.Req()
            .setPutRuleReq(new ConceptProto.ConceptManager.PutRule.Req()
                    .setLabel(label)
                    .setWhen(when)
                    .setThen(then));
        const res = await this.execute(req);
        return RuleImpl.of(res.getPutRuleRes().getRule());
    }

    async getThing(iid: string): Promise<Thing> {
        const req = new ConceptProto.ConceptManager.Req()
            .setGetThingReq(new ConceptProto.ConceptManager.GetThing.Req().setIid(iid));
        const res = await this.execute(req);
        if (res.getGetThingRes().getResCase() === ConceptProto.ConceptManager.GetThing.Res.ResCase.THING)
            return ConceptProtoReader.thing(res.getGetThingRes().getThing());
        else
            return null;
    }

    async getType(label: string): Promise<Type> {
        const req = new ConceptProto.ConceptManager.Req()
            .setGetTypeReq(new ConceptProto.ConceptManager.GetType.Req().setLabel(label));
        const res = await this.execute(req);
        if (res.getGetTypeRes().getResCase() === ConceptProto.ConceptManager.GetType.Res.ResCase.TYPE)
            return ConceptProtoReader.type(res.getGetTypeRes().getType());
        else
            return null;
    }

    async getRule(label: string): Promise<Rule> {
        const req = new ConceptProto.ConceptManager.Req()
            .setGetRuleReq(new ConceptProto.ConceptManager.GetRule.Req().setLabel(label));
        const res = await this.execute(req);
        if (res.getGetRuleRes().getResCase() === ConceptProto.ConceptManager.GetRule.Res.ResCase.RULE) return RuleImpl.of(res.getGetRuleRes().getRule());
        return null;
    }

    private async execute(conceptManagerReq: ConceptProto.ConceptManager.Req): Promise<ConceptProto.ConceptManager.Res> {
        const transactionReq = new TransactionProto.Transaction.Req()
            .setConceptManagerReq(conceptManagerReq);
        return await this._rpcTransaction.execute(transactionReq, res => res.getConceptManagerRes());
    }
}