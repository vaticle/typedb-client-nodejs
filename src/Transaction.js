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
/**
 * This object represents a transaction which is produced by Grakn and allows the user to construct and perform
 * basic look ups to the knowledge base. This also allows the execution of Graql queries.
 *
 * @param {Object} txService Object implementing all the functionalities of gRPC Transaction service as defined in grakn.proto
 */
class Transaction {
    constructor(txService) {
        this.txService = txService;
    }
    /**
     * Executes a given Graql query on the keyspace this transaction is bound to
     * @param {String} query String representing a Graql query
     */
    query(query, options) {
        return this.txService.query(query, options);
    }
    /**
     * Commits any changes to the graph and closes the transaction. The user must use the Session object to
     * get a new open transaction.
     */
    async commit() {
        await this.txService.commit();
        return this.close();
    }
    /**
     * Get the Concept with identifier provided, if it exists.
     *
     * @param {String} conceptId A unique identifier for the Concept in the graph.
     */
    getConcept(conceptId) {
        return this.txService.getConcept(conceptId);
    }
    getSchemaConcept(label) {
        return this.txService.getSchemaConcept(label);
    }
    getAttributesByValue(attributeValue, dataType) {
        return this.txService.getAttributesByValue(attributeValue, dataType);
    }
    putEntityType(label) {
        return this.txService.putEntityType(label);
    }
    putRelationType(label) {
        return this.txService.putRelationType(label);
    }
    putAttributeType(label, dataType) {
        return this.txService.putAttributeType(label, dataType);
    }
    putRole(label) {
        return this.txService.putRole(label);
    }
    putRule(label, when, then) {
        return this.txService.putRule(label, when, then);
    }
    close() {
        return this.txService.close();
    }
    isOpen() {
        return this.txService.isOpen();
    }
}

module.exports = Transaction;