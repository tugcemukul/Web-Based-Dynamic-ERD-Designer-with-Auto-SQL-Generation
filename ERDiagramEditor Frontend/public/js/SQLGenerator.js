export class SQLGenerator {
    generateSQLCode(diagramJSON) {
        if (!diagramJSON) {
            alert('Please save the diagram first.');
            return '';
        }

        let sqlCode = '';
        const entityMap = {};
        const attributeMap = {};
        const relationships = [];

        // Entity, Attribute ve ilişki bilgilerini haritalandır
        diagramJSON.cells.forEach(cell => {
            if (cell.type === 'erd.Entity') {
                const entityName = (cell.attrs.label?.text || "Entity").replace(/\s+/g, '_');
                entityMap[cell.id] = {
                    name: entityName,
                    attributes: []
                };
            } else if (cell.type === 'erd.Attribute') {
                attributeMap[cell.id] = cell;
                const linkedEntity = diagramJSON.cells.find(link =>
                    link.type === 'standard.Link' &&
                    link.target.id === cell.id &&
                    entityMap[link.source.id]
                );
                if (linkedEntity) {
                    entityMap[linkedEntity.source.id].attributes.push(cell);
                }
            } else if (cell.type === 'erd.Relationship') {
                relationships.push(cell);
            }
        });

        // Entity'ler için CREATE TABLE
        Object.keys(entityMap).forEach(entityId => {
            const entity = entityMap[entityId];
            const tableName = entity.name;
            let columns = [];
            let foreignKeys = [];

            entity.attributes.forEach(attr => {
                let columnName = attr.attrs.data.attributeName.replace(/\s+/g, '_');
                let columnType = attr.attrs.data.dataType || 'VARCHAR(255)';
                let nullable = attr.attrs.data.isNullable ? 'NULL' : 'NOT NULL';

                let column = `${columnName} ${columnType} ${nullable}`;

                if (attr.attrs.data.isPrimaryKey) {
                    column += ' PRIMARY KEY';
                }

                if (attr.attrs.data.isForeignKey) {
                    const fkReference = attr.attrs.data.fkReference;
                    if (fkReference) {
                        const referencedAttr = attributeMap[fkReference];
                        const referencedEntity = this.findEntityByAttribute(referencedAttr, entityMap);
                        if (referencedAttr && referencedEntity) {
                            const onDeleteBehavior = attr.attrs.data.isNullable ? 'SET NULL' : 'CASCADE';
                            foreignKeys.push(
                                `FOREIGN KEY (${columnName}) REFERENCES ${referencedEntity.name}(${referencedAttr.attrs.data.attributeName.replace(/\s+/g, '_')}) ON DELETE ${onDeleteBehavior} ON UPDATE CASCADE`
                            );
                        }
                    }
                }

                columns.push(column);
            });

            const allColumns = columns.concat(foreignKeys);
            sqlCode += `CREATE TABLE ${tableName} (\n  ${allColumns.join(',\n  ')}\n);\n\n`;
        });

        // Relationship'ler için CREATE TABLE veya FOREIGN KEY
        relationships.forEach(rel => {
            const relName = rel.attrs.label?.text.replace(/\s+/g, '_') || "Relationship";
            const relatedLinks = diagramJSON.cells.filter(link =>
                link.type === 'standard.Link' &&
                link.source.id === rel.id
            );

            if (relatedLinks.length >= 2) {
                const sourceLink = relatedLinks[0];
                const targetLink = relatedLinks[1];

                const sourceEntity = entityMap[sourceLink.target.id];
                const targetEntity = entityMap[targetLink.target.id];

                const sourceCardinality = sourceLink.attrs.data?.cardinality || 'N';
                const targetCardinality = targetLink.attrs.data?.cardinality || 'N';

                const sourcePrimaryKey = this.getPrimaryKey(sourceEntity);
                const targetPrimaryKey = this.getPrimaryKey(targetEntity);

                if (sourceEntity && targetEntity) {
                    if (this.needsJunctionTable(sourceCardinality, targetCardinality)) {
                        const junctionTableName = `${sourceEntity.name}_${relName}_${targetEntity.name}`;
                        let junctionColumns = [];
                        let junctionForeignKeys = [];

                        junctionColumns.push(`${sourceEntity.name}_${sourcePrimaryKey} INT NOT NULL`);
                        junctionColumns.push(`${targetEntity.name}_${targetPrimaryKey} INT NOT NULL`);

                        junctionForeignKeys.push(
                            `FOREIGN KEY (${sourceEntity.name}_${sourcePrimaryKey}) REFERENCES ${sourceEntity.name}(${sourcePrimaryKey}) ON DELETE CASCADE ON UPDATE CASCADE`
                        );
                        junctionForeignKeys.push(
                            `FOREIGN KEY (${targetEntity.name}_${targetPrimaryKey}) REFERENCES ${targetEntity.name}(${targetPrimaryKey}) ON DELETE CASCADE ON UPDATE CASCADE`
                        );

                        const relAttributes = this.getRelationshipAttributes(rel, attributeMap, diagramJSON);
                        relAttributes.forEach(attr => {
                            let columnName = attr.attrs.data.attributeName.replace(/\s+/g, '_');
                            let columnType = attr.attrs.data.dataType || 'VARCHAR(255)';
                            let nullable = attr.attrs.data.isNullable ? 'NULL' : 'NOT NULL';
                            junctionColumns.push(`${columnName} ${columnType} ${nullable}`);
                        });

                        sqlCode += `CREATE TABLE ${junctionTableName} (\n`;
                        sqlCode += `  ${junctionColumns.join(',\n  ')},\n`;
                        sqlCode += `  ${junctionForeignKeys.join(',\n  ')}\n);\n\n`;
                    } else {
                        if (sourceCardinality.includes('1') && targetCardinality.includes('N')) {
                            sqlCode = this.addForeignKeyToEntity(
                                sqlCode,
                                targetEntity.name,
                                `${sourceEntity.name}_${sourcePrimaryKey} INT`,
                                `FOREIGN KEY (${sourceEntity.name}_${sourcePrimaryKey}) REFERENCES ${sourceEntity.name}(${sourcePrimaryKey}) ON DELETE CASCADE ON UPDATE CASCADE`
                            );
                        } else if (sourceCardinality.includes('N') && targetCardinality.includes('1')) {
                            sqlCode = this.addForeignKeyToEntity(
                                sqlCode,
                                sourceEntity.name,
                                `${targetEntity.name}_${targetPrimaryKey} INT`,
                                `FOREIGN KEY (${targetEntity.name}_${targetPrimaryKey}) REFERENCES ${targetEntity.name}(${targetPrimaryKey}) ON DELETE CASCADE ON UPDATE CASCADE`
                            );
                        }
                    }
                }
            }
        });

        return sqlCode;
    }

    getRelationshipAttributes(relationship, attributeMap, diagramJSON) {
        // Relationship'e bağlı attribute'ları getirir
        const attributes = [];
        diagramJSON.cells.forEach(link => {
            if (link.type === 'standard.Link' && link.source.id === relationship.id) {
                const attribute = attributeMap[link.target.id];
                if (attribute) {
                    attributes.push(attribute);
                }
            }
        });
        return attributes;
    }

    needsJunctionTable(sourceCardinality, targetCardinality) {
        // N-N ilişkilerde junction table gerekir
        if (sourceCardinality.includes('N') && targetCardinality.includes('N')) {
            return true;
        }
        return false;
    }

    addForeignKeyToEntity(sqlCode, tableName, newColumn, foreignKey) {
        const tableRegex = new RegExp(`CREATE TABLE ${tableName} \$begin:math:text$([^)]+)\\$end:math:text$`, 's');
        const match = sqlCode.match(tableRegex);
        if (match) {
            const columns = match[1].trim().split(',\n  ').concat([newColumn, foreignKey]);
            return sqlCode.replace(match[0], `CREATE TABLE ${tableName} (\n  ${columns.join(',\n  ')}\n)`);
        }
        return sqlCode;
    }

    getPrimaryKey(entity) {
        const primaryKeyAttr = entity.attributes.find(attr => attr.attrs.data.isPrimaryKey);
        return primaryKeyAttr ? primaryKeyAttr.attrs.data.attributeName : 'ID';
    }

    findEntityByAttribute(attr, entityMap) {
        return Object.values(entityMap).find(entity =>
            entity.attributes.some(attribute => attribute.id === attr.id)
        );
    }

    determineCascade(cardinality) {
        switch (cardinality) {
            case '1':
                return 'ON DELETE CASCADE ON UPDATE CASCADE';
            case 'N':
            case '1..N':
            case '0..N':
                return 'ON DELETE SET NULL ON UPDATE CASCADE';
            default:
                return '';
        }
    }
}
