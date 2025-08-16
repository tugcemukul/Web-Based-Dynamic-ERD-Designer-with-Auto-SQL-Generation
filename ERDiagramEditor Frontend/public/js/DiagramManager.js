import { dataTypeColorMap } from './Constants.js';
import { HistoryManager } from './HistoryManager.js';

export class DiagramManager {
    constructor(graph, paper) {
        this.graph = graph;
        this.paper = paper;
        this.undoStack = [];
        this.redoStack = [];
        this.history = new HistoryManager(graph);

        this.addEntityMode = false;
        this.addRelationshipMode = false;
        this.deleteMode = false;
        this.persistentDeleteMode = false;
        this.zoomLevel = 1;
        this.zoomStep = 0.1;
        this.minZoom = 0.5;
        this.maxZoom = 2;

        this.isPanning = false;
        this.panStartPosition = { x:0, y:0 };

        this.initEvents();
    }

    initEvents() {
        // Sağ tıklama menüsü
        $('#diagram-container').on('contextmenu', (event) => {
            event.preventDefault();
            var cellView = this.paper.findView(event.target);

            if (cellView && cellView.model instanceof joint.shapes.erd.Entity) {
                this.showEntityContextMenu(event, cellView);
            }

            if (cellView && cellView.model instanceof joint.shapes.erd.Attribute && cellView.model.attr('data/isForeignKey')) {
                this.showForeignKeyContextMenu(event, cellView.model);
            }
            if (cellView && cellView.model instanceof joint.shapes.erd.Relationship) {
                this.showRelationshipContextMenu(event, cellView);
            }
        });

        // Çift tıklama ile isim veya attribute düzenleme
        $('#diagram-container').on('dblclick', '.joint-cell', (event) => {
            const cellView = this.paper.findView(event.currentTarget);
            if (cellView.model instanceof joint.shapes.erd.Attribute) {
                this.editAttribute(cellView);
            } else if (cellView.model instanceof joint.shapes.erd.Entity || cellView.model instanceof joint.shapes.erd.Relationship) {
                this.editEntityOrRelationshipName(cellView);
            }
        });

        // Eleman silme
        this.paper.on('cell:pointerdown', (cellView) => {
            if (this.deleteMode || this.persistentDeleteMode) {
                this.deleteElement(cellView);
            }
        });

        // Zoom etkinlikleri main.js'de yönetilebilir ama burada da yönetilebilir, istenirse burada bırakıyoruz.
        // Panning main.js'de yönetilecekti, oradaki mantığı isterseniz buraya da alabiliriz.
        // Bunda panning ve zooming main.js'de yapıldıysa tekrar burada yapmaya gerek yok.

        // Linklerin cardinality ayarı vs. context menü üzerinden.
    }

    showEntityContextMenu(event, cellView) {
        var menu = $('<div class="context-menu"></div>');
        menu.css({
            position: 'fixed',
            left: event.pageX,
            top: event.pageY,
            background: '#f8f8f8',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '5px',
            zIndex: 1000,
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)'
        });

        var addAttributeItem = $('<div class="context-menu-item">Add Attribute</div>');
        addAttributeItem.css({ padding: '5px 10px', cursor: 'pointer', borderRadius: '3px' });

        var addCardinalityItem = $('<div class="context-menu-item">Add Cardinality</div>');
        addCardinalityItem.css({ padding: '5px 10px', cursor: 'pointer', borderRadius: '3px' });

        addAttributeItem.on('click', () => {
            this.addAttributeToEntity(cellView.model);
            menu.remove();
        });

        addCardinalityItem.on('click', () => {
            var relatedLinks = this.graph.getConnectedLinks(cellView.model);
            var relationshipLink = relatedLinks.find(link => {
                var targetElement = link.getTargetElement();
                var sourceElement = link.getSourceElement();
                return (targetElement instanceof joint.shapes.erd.Relationship || sourceElement instanceof joint.shapes.erd.Relationship);
            });

            if (relationshipLink) {
                var relationship = relationshipLink.getTargetElement() || relationshipLink.getSourceElement();
                this.setCardinality(relationshipLink, cellView.model, relationship);
            } else {
                alert('No relationship found for this entity.');
            }
            menu.remove();
        });

        menu.append(addAttributeItem);
        menu.append(addCardinalityItem);
        $('body').append(menu);

        $(document).on('click.contextMenu', function () {
            menu.remove();
            $(document).off('click.contextMenu');
        });
    }

    showForeignKeyContextMenu(event, foreignKeyAttr) {
        const menu = $('<div class="context-menu"></div>');
        menu.css({
            position: 'fixed',
            left: event.pageX,
            top: event.pageY,
            background: '#f8f8f8',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '5px',
            zIndex: 1000,
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)'
        });

        const addPrimaryKeyReferenceItem = $('<div class="context-menu-item">Add Primary Key Reference</div>');
        addPrimaryKeyReferenceItem.css({ padding: '5px 10px', cursor: 'pointer', borderRadius: '3px' });

        addPrimaryKeyReferenceItem.on('click', () => {
            menu.remove();
            this.initiatePrimaryKeySelection(foreignKeyAttr);
        });

        menu.append(addPrimaryKeyReferenceItem);
        $('body').append(menu);

        $(document).on('click.contextMenu', () => {
            menu.remove();
            $(document).off('click.contextMenu');
        });
    }

    showRelationshipContextMenu(event, cellView) {
        var menu = $('<div class="context-menu"></div>');
        menu.css({
            position: 'fixed',
            left: event.pageX,
            top: event.pageY,
            background: '#f8f8f8',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '5px',
            zIndex: 1000,
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)'
        });

        var addAttributeItem = $('<div class="context-menu-item">Add Attribute</div>');
        addAttributeItem.css({ padding: '5px 10px', cursor: 'pointer', borderRadius: '3px' });

        addAttributeItem.on('click', () => {
            this.addAttributeToRelationship(cellView.model);
            menu.remove();
        });

        menu.append(addAttributeItem);
        $('body').append(menu);

        $(document).on('click.contextMenu', function () {
            menu.remove();
            $(document).off('click.contextMenu');
        });
    }

    addAttributeToRelationship(relationship) {
        this.history.saveState();

        var attributeForm = $('<div></div>');
        var input = $('<input type="text" placeholder="Attribute Name"/>');
        var dataTypeSelect = $('<select id="data-type-select"></select>');
        var varcharLengthInput = $('<input type="number" id="varchar-length" placeholder="Length (e.g., 255)" style="display: none; margin-top: 10px;" />');
        var nullableCheckbox = $('<label><input type="checkbox" id="nullable-checkbox"/> Nullable</label><br>');

        dataTypeSelect.append('<option value="INT">INT</option>');
        dataTypeSelect.append('<option value="VARCHAR">VARCHAR</option>');
        dataTypeSelect.append('<option value="CHAR">CHAR</option>');
        dataTypeSelect.append('<option value="DATE">DATE</option>');
        dataTypeSelect.append('<option value="BOOLEAN">BOOLEAN</option>');

        var saveButton = $('<button>Kaydet</button>');
        var cancelButton = $('<button>İptal</button>');

        // Tasarım Ayarları
        input.css({ width: '100%', marginBottom: '10px' });

        saveButton.css({
            'background-color': '#2ecc71',
            color: 'white',
            border: 'none',
            'border-radius': '3px',
            padding: '5px 10px',
            cursor: 'pointer',
            'margin-right': '10px'
        });

        cancelButton.css({
            'background-color': '#e74c3c',
            color: 'white',
            border: 'none',
            'border-radius': '3px',
            padding: '5px 10px',
            cursor: 'pointer'
        });

        attributeForm.css({
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            padding: '20px',
            border: '1px solid #ccc',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
            backgroundColor: 'white',
            zIndex: 1000
        });

        // Form İçeriği
        attributeForm.append('<label>Attribute Name:</label><br>');
        attributeForm.append(input);
        attributeForm.append(nullableCheckbox); // Nullable seçeneği
        attributeForm.append('<label>Data Type:</label><br>');
        attributeForm.append(dataTypeSelect);
        attributeForm.append(varcharLengthInput); // VARCHAR uzunluğu
        attributeForm.append('<br><br>');
        attributeForm.append(saveButton);
        attributeForm.append(cancelButton);

        $('body').append(attributeForm);

        // Data Type değişince VARCHAR için uzunluk kutusunu göster
        dataTypeSelect.on('change', function () {
            if ($(this).val() === 'VARCHAR') {
                varcharLengthInput.show();
            } else {
                varcharLengthInput.hide();
            }
        });

        // Kaydetme İşlemi
        saveButton.on('click', () => {
            var attributeName = input.val();
            var dataType = $('#data-type-select').val();
            var varcharLength = $('#varchar-length').val();
            var isNullable = $('#nullable-checkbox').is(':checked');

            if (!attributeName) {
                alert('Attribute name is required!');
                return;
            }

            if (dataType === 'VARCHAR' && !varcharLength) {
                alert('Please specify the length for VARCHAR type.');
                return;
            }

            var dataTypeText = dataType === 'VARCHAR' ? `VARCHAR(${varcharLength})` : dataType;

            var attribute = new joint.shapes.erd.Attribute();
            var relationshipPosition = relationship.position();
            attribute.position(relationshipPosition.x + 200, relationshipPosition.y);
            attribute.resize(120, 60);
            attribute.attr({
                label: {
                    text: attributeName,
                    fill: 'white'
                },
                body: {
                    fill: dataTypeColorMap[dataType],
                    stroke: '#27ae60',
                    strokeWidth: 2
                },
                data: {
                    attributeName: attributeName,
                    dataType: dataTypeText,
                    isNullable: isNullable
                }
            });
            attribute.addTo(this.graph);

            this.linkEntities(relationship, attribute);

            this.history.saveState();
            attributeForm.remove();
        });

        // İptal İşlemi
        cancelButton.on('click', () => {
            attributeForm.remove();
        });
    }
    editAttribute(cellView) {
        const currentName = cellView.model.attr('data/attributeName');
        const currentDataType = cellView.model.attr('data/dataType');
        const isNullable = cellView.model.attr('data/isNullable');

        // Relationship attribute olup olmadığını kontrol et
        const isRelationshipAttribute = this.graph.getConnectedLinks(cellView.model).some(link => {
            const source = link.source();
            const target = link.target();
            const sourceModel = this.graph.getCell(source.id);
            const targetModel = this.graph.getCell(target.id);
            return (
                (sourceModel instanceof joint.shapes.erd.Relationship || targetModel instanceof joint.shapes.erd.Relationship) &&
                link.target().id === cellView.model.id
            );
        });

        var attributeForm = $('<div></div>');
        var input = $('<input type="text" placeholder="Attribute Name"/>');
        var nullableCheckbox = $('<label><input type="checkbox" id="nullable-checkbox"/> Nullable</label><br>');
        var dataTypeSelect = $('<select id="data-type-select"></select>');
        var varcharLengthInput = $('<input type="number" id="varchar-length" placeholder="Length (e.g., 255)" style="display: none; margin-top: 10px;" />');

        dataTypeSelect.append('<option value="INT">INT</option>');
        dataTypeSelect.append('<option value="VARCHAR">VARCHAR</option>');
        dataTypeSelect.append('<option value="CHAR">CHAR</option>');
        dataTypeSelect.append('<option value="DATE">DATE</option>');
        dataTypeSelect.append('<option value="BOOLEAN">BOOLEAN</option>');

        input.val(currentName);
        if (isNullable) nullableCheckbox.find('input').prop('checked', true);

        if (currentDataType.startsWith('VARCHAR')) {
            const lengthMatch = currentDataType.match(/\((\d+)\)/);
            if (lengthMatch) {
                varcharLengthInput.val(lengthMatch[1]);
                varcharLengthInput.show();
            }
            dataTypeSelect.val('VARCHAR');
        } else {
            dataTypeSelect.val(currentDataType);
        }

        var saveButton = $('<button>Kaydet</button>');
        var cancelButton = $('<button>İptal</button>');

        // Tasarım Ayarları
        input.css({ width: '100%', marginBottom: '10px' });

        saveButton.css({
            'background-color': '#2ecc71',
            color: 'white',
            border: 'none',
            'border-radius': '3px',
            padding: '5px 10px',
            cursor: 'pointer',
            'margin-right': '10px'
        });

        cancelButton.css({
            'background-color': '#e74c3c',
            color: 'white',
            border: 'none',
            'border-radius': '3px',
            padding: '5px 10px',
            cursor: 'pointer'
        });

        attributeForm.css({
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            padding: '20px',
            border: '1px solid #ccc',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
            backgroundColor: 'white',
            zIndex: 1000
        });

        // Form İçeriği
        attributeForm.append('<label>Attribute Name:</label><br>');
        attributeForm.append(input);

        if (isRelationshipAttribute) {
            // Sadece nullable seçeneği üstte olacak şekilde düzenle
            attributeForm.append(nullableCheckbox);
            attributeForm.append('<label>Data Type:</label><br>');
            attributeForm.append(dataTypeSelect);
            attributeForm.append(varcharLengthInput);
        } else {
            // Tüm seçenekler mevcut, nullable yine üstte
            const pkCheckbox = $('<label><input type="checkbox" id="pk-checkbox"/> Primary Key</label><br>');
            const fkCheckbox = $('<label><input type="checkbox" id="fk-checkbox"/> Foreign Key</label><br>');
            const isPrimaryKey = cellView.model.attr('data/isPrimaryKey');
            const isForeignKey = cellView.model.attr('data/isForeignKey');

            if (isPrimaryKey) pkCheckbox.find('input').prop('checked', true);
            if (isForeignKey) fkCheckbox.find('input').prop('checked', true);

            attributeForm.append(pkCheckbox);
            attributeForm.append(fkCheckbox);
            attributeForm.append(nullableCheckbox); // Nullable seçeneği Data Type'ın üstünde
            attributeForm.append('<label>Data Type:</label><br>');
            attributeForm.append(dataTypeSelect);
            attributeForm.append(varcharLengthInput);
        }

        attributeForm.append('<br><br>');
        attributeForm.append(saveButton);
        attributeForm.append(cancelButton);

        $('body').append(attributeForm);

        dataTypeSelect.on('change', function () {
            if ($(this).val() === 'VARCHAR') {
                varcharLengthInput.show();
            } else {
                varcharLengthInput.hide();
            }
        });

        // Kaydetme İşlemi
        saveButton.on('click', () => {
            const attributeName = input.val();
            const newIsNullable = $('#nullable-checkbox').is(':checked');
            const dataType = $('#data-type-select').val();
            const varcharLength = $('#varchar-length').val();

            if (!attributeName) {
                alert('Attribute name is required!');
                return;
            }

            if (dataType === 'VARCHAR' && !varcharLength) {
                alert('Please specify the length for VARCHAR type.');
                return;
            }

            const dataTypeText = dataType === 'VARCHAR' ? `VARCHAR(${varcharLength})` : dataType;

            cellView.model.attr('label/text', attributeName);
            cellView.model.attr('data/attributeName', attributeName);
            cellView.model.attr('data/dataType', dataTypeText);
            cellView.model.attr('data/isNullable', newIsNullable);

            if (!isRelationshipAttribute) {
                const newIsPrimaryKey = $('#pk-checkbox').is(':checked');
                const newIsForeignKey = $('#fk-checkbox').is(':checked');

                cellView.model.attr('data/isPrimaryKey', newIsPrimaryKey);
                cellView.model.attr('data/isForeignKey', newIsForeignKey);
            }

            this.history.saveState();
            attributeForm.remove();
        });

        // İptal Butonu İşlevi
        cancelButton.on('click', () => {
            attributeForm.remove();
        });
    }

    editEntityOrRelationshipName(cellView) {
        const currentName = cellView.model.attr('label/text');

        var input = $('<input type="text"/>');
        var saveButton = $('<button>Kaydet</button>');
        var cancelButton = $('<button>İptal</button>');

        input.val(currentName);
        input.css({ width: '100%', marginBottom: '10px' });

        saveButton.css({
            'background-color': '#2ecc71',
            color: 'white',
            border: 'none',
            'border-radius': '3px',
            padding: '5px 10px',
            cursor: 'pointer',
            'margin-right': '10px'
        });

        cancelButton.css({
            'background-color': '#e74c3c',
            color: 'white',
            border: 'none',
            'border-radius': '3px',
            padding: '5px 10px',
            cursor: 'pointer'
        });

        var form = $('<div></div>');
        form.css({
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            padding: '20px',
            border: '1px solid #ccc',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
            backgroundColor: 'white',
            zIndex: 1000
        });
        form.append('<label>Entity/Relationship Name:</label><br>');
        form.append(input);
        form.append('<br><br>');
        form.append(saveButton);
        form.append(cancelButton);

        $('body').append(form);

        saveButton.on('click', () => {
            var newName = input.val();
            cellView.model.attr('label/text', newName);
            this.history.saveState();
            form.remove();
        });

        cancelButton.on('click', () => {
            form.remove();
        });
    }

    addEntity(x, y, entityName = 'Entity') {
        console.log("ula geldi add entity ici");
        var entity = new joint.shapes.erd.Entity();
        entity.position(x, y);
        entity.resize(150, 70); //genişliği ve yüksekliği
        entity.attr({
            label: { text: entityName }
        });
        entity.addTo(this.graph);
        this.history.saveState();
        return entity;
    }

    addAttributeToEntity(entity) {
        this.history.saveState();
        var attributeForm = $('<div></div>'); //metin, onay kutuları vs
        var input = $('<input type="text" placeholder="Attribute Name"/>');
        var pkCheckbox = $('<label><input type="checkbox" id="pk-checkbox"/> Primary Key</label><br>');
        var fkCheckbox = $('<label><input type="checkbox" id="fk-checkbox"/> Foreign Key</label><br>');
        var nullableCheckbox = $('<label><input type="checkbox" id="nullable-checkbox"/> Nullable</label><br>');
        var dataTypeSelect = $('<select id="data-type-select"></select>');
        var varcharLengthInput = $('<input type="number" id="varchar-length" placeholder="Length (e.g., 255)" style="display: none; margin-top: 10px;" />');

        dataTypeSelect.append('<option value="INT">INT</option>'); //açılır listeye eklenen veri türleri
        dataTypeSelect.append('<option value="VARCHAR">VARCHAR</option>');
        dataTypeSelect.append('<option value="CHAR">CHAR</option>');
        dataTypeSelect.append('<option value="DATE">DATE</option>');
        dataTypeSelect.append('<option value="BOOLEAN">BOOLEAN</option>');

        var saveButton = $('<button>Kaydet</button>');
        var cancelButton = $('<button>İptal</button>');

        input.css({ width: '100%', marginBottom: '10px' });

        saveButton.css({
            'background-color': '#2ecc71',
            color: 'white',
            border: 'none',
            'border-radius': '3px',
            padding: '5px 10px',
            cursor: 'pointer',
            'margin-right': '10px'
        });

        cancelButton.css({
            'background-color': '#e74c3c',
            color: 'white',
            border: 'none',
            'border-radius': '3px',
            padding: '5px 10px',
            cursor: 'pointer'
        });

        attributeForm.css({
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            padding: '20px',
            border: '1px solid #ccc',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
            backgroundColor: 'white',
            zIndex: 1000
        });
        attributeForm.append('<label>Attribute Name:</label><br>');
        attributeForm.append(input);
        attributeForm.append(pkCheckbox);
        attributeForm.append(fkCheckbox);
        attributeForm.append(nullableCheckbox);
        attributeForm.append('<label>Data Type:</label><br>');
        attributeForm.append(dataTypeSelect);
        attributeForm.append(varcharLengthInput);
        attributeForm.append('<br><br>');
        attributeForm.append(saveButton);
        attributeForm.append(cancelButton);

        $('body').append(attributeForm);

        dataTypeSelect.on('change', function () { //varchar seçildiğinde uzunluğu belirleyecek giriş kutusu
            if ($(this).val() === 'VARCHAR') {
                varcharLengthInput.show();
            } else {
                varcharLengthInput.hide();
            }
        });

        saveButton.on('click', () => {
            var attributeName = input.val();
            var isPrimaryKey = $('#pk-checkbox').is(':checked');
            var isForeignKey = $('#fk-checkbox').is(':checked');
            var isNullable = $('#nullable-checkbox').is(':checked');
            var dataType = $('#data-type-select').val();
            var varcharLength = $('#varchar-length').val();

            if (!attributeName) {
                alert('Attribute name is required!');
                return;
            }

            if (dataType === 'VARCHAR' && !varcharLength) {
                alert('Please specify the length for VARCHAR type.');
                return;
            }

            var dataTypeText = dataType === 'VARCHAR' ? `VARCHAR(${varcharLength})` : dataType;

            var label = attributeName + (isForeignKey ? ' *' : '');
            var labelAttrs = {};

            if (isPrimaryKey) {
                labelAttrs.textDecoration = 'underline';
                labelAttrs.textDecorationStyle = 'solid';
                labelAttrs.textDecorationThickness = '3px';
            } else {
                labelAttrs.textDecoration = 'none';
                labelAttrs.textDecorationStyle = 'none';
                labelAttrs.textDecorationThickness = '0px';
            }

            var attribute = new joint.shapes.erd.Attribute();
            var entityPosition = entity.position();
            attribute.position(entityPosition.x + 200, entityPosition.y);
            attribute.resize(120, 60);
            attribute.attr({
                label: {
                    text: label,
                    fill: 'white',
                    ...labelAttrs
                },
                body: {
                    fill: dataTypeColorMap[dataType],
                    stroke: isPrimaryKey ? 'white' : '#27ae60',
                    strokeWidth: isPrimaryKey ? 2 : 0
                },
                data: {
                    attributeName: attributeName,
                    dataType: dataTypeText,
                    isPrimaryKey: isPrimaryKey,
                    isForeignKey: isForeignKey,
                    isNullable: isNullable,
                    fkReference: null
                }
            });
            attribute.addTo(this.graph);

            this.linkEntities(entity, attribute); //çizgi

            this.history.saveState();
            attributeForm.remove();
        });

        cancelButton.on('click', () => {
            attributeForm.remove();
        });
    }

    addRelationship(x, y, relationshipName = 'Relationship') {
        this.history.saveState();
        var relationship = new joint.shapes.erd.Relationship();
        relationship.position(x, y);
        relationship.resize(100, 100);
        relationship.attr({
            label: { text: relationshipName }
        });
        relationship.addTo(this.graph);

        var linkCount = 0;

        let entityClickHandler = (entityCellView) => { //ilişki eklendikten sonraki iki tıklama
            if (entityCellView.model instanceof joint.shapes.erd.Entity) {
                this.linkEntities(relationship, entityCellView.model);
                linkCount++;
                if (linkCount === 2) {
                    this.paper.off('cell:pointerdown', entityClickHandler);
                    this.history.saveState();
                }
            }
        };

        this.paper.on('cell:pointerdown', entityClickHandler);

        return relationship;
    }

    linkEntities(source, target) {
        var link = new joint.shapes.standard.Link();
        link.source(source);
        link.target(target);
        link.attr({
            line: {
                stroke: '#34495e',
                strokeWidth: 2,
                sourceMarker: null, //kaynakta işaretçi yok
                targetMarker: null //hedefte işaretçi yok
            }
        });
        link.addTo(this.graph);
        this.history.saveState();
        return link;
    }

    setCardinality(link, entity, relationship) {
        this.history.saveState();

        var relatedLinks = this.graph.getConnectedLinks(entity);
        var relationshipLinks = relatedLinks.filter(lnk => {
            var targetElement = lnk.getTargetElement();
            var sourceElement = lnk.getSourceElement();
            return (targetElement instanceof joint.shapes.erd.Relationship || sourceElement instanceof joint.shapes.erd.Relationship);
        });

        if (relationshipLinks.length === 1) {
            // Tek ilişki varsa direkt cardinality seçimi yap
            this.showCardinalitySelection(relationshipLinks[0], entity);
        } else if (relationshipLinks.length > 1) {
            // Birden fazla ilişki varsa ilişki seçimi yap
            this.showRelationshipAndCardinalitySelection(relationshipLinks, entity);
        } else {
            alert('No relationship found for this entity.');
        }
    }

    showCardinalitySelection(link, entity) {
        var cardinalityForm = $('<div></div>');
        var overlay = $('<div></div>');
        overlay.css({
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
        });

        cardinalityForm.css({
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '10px',
            backgroundColor: 'white',
            zIndex: 1000,
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
        });

        var cardinalityLabel = $('<label><strong>Enter cardinality for ' + entity.attr('label/text') + ':</strong></label><br>');
        var cardinalitySelect = $('<select style="width: 100%; margin-bottom: 10px;"></select>');
        cardinalitySelect.append('<option value="">--Select Cardinality--</option>');
        cardinalitySelect.append('<option value="1">1</option>');
        cardinalitySelect.append('<option value="N">N</option>');
        cardinalitySelect.append('<option value="1..N">1..N</option>');
        cardinalitySelect.append('<option value="0..N">0..N</option>');

        var saveButton = $('<button>Kaydet</button>');
        var cancelButton = $('<button>İptal</button>');

        saveButton.css({
            'background-color': '#2ecc71',
            color: 'white',
            border: 'none',
            'border-radius': '3px',
            padding: '10px 20px',
            cursor: 'pointer',
            'margin-right': '10px',
            width: '45%'
        });

        cancelButton.css({
            'background-color': '#e74c3c',
            color: 'white',
            border: 'none',
            'border-radius': '3px',
            padding: '10px 20px',
            cursor: 'pointer',
            width: '45%'
        });

        cardinalityForm.append(cardinalityLabel);
        cardinalityForm.append(cardinalitySelect);
        cardinalityForm.append('<br><br>');
        cardinalityForm.append(saveButton);
        cardinalityForm.append(cancelButton);

        $('body').append(overlay);
        $('body').append(cardinalityForm);

        saveButton.on('click', () => {
            var cardinality = cardinalitySelect.val();

            if (!cardinality) {
                alert('Please select a valid cardinality!');
                return;
            }

            link.label(0, {
                position: 0.5,
                attrs: {
                    text: {
                        text: cardinality,
                        fill: '#34495e',
                        fontSize: 16,
                        fontWeight: 'bold'
                    }
                }
            });

            link.attr('data/cardinality', cardinality);
            this.history.saveState();
            cardinalityForm.remove();
            overlay.remove();
        });

        cancelButton.on('click', () => {
            cardinalityForm.remove();
            overlay.remove();
        });
    }

    showRelationshipAndCardinalitySelection(relationshipLinks, entity) {
        var selectionForm = $('<div></div>');
        var overlay = $('<div></div>');
        overlay.css({
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
        });

        selectionForm.css({
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '10px',
            backgroundColor: 'white',
            zIndex: 1000,
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
        });

        var relationshipLabel = $('<label><strong>Select a relationship for ' + entity.attr('label/text') + ':</strong></label><br>');
        var relationshipSelect = $('<select style="width: 100%; margin-bottom: 10px;"></select>');

        relationshipLinks.forEach(link => {
            var relationship = this.graph.getCell(link.get('source').id) || this.graph.getCell(link.get('target').id);
            var relationshipName = (relationship instanceof joint.shapes.erd.Relationship)
                ? (relationship.attr('label/text') || 'Unnamed Relationship')
                : 'Invalid Relationship';
            relationshipSelect.append(`<option value="${link.id}">${relationshipName}</option>`);
        });

        var cardinalityLabel = $('<label><strong>Enter cardinality:</strong></label><br>');
        var cardinalitySelect = $('<select style="width: 100%; margin-bottom: 10px;"></select>');
        cardinalitySelect.append('<option value="">--Select Cardinality--</option>');
        cardinalitySelect.append('<option value="1">1</option>');
        cardinalitySelect.append('<option value="N">N</option>');
        cardinalitySelect.append('<option value="1..N">1..N</option>');
        cardinalitySelect.append('<option value="0..N">0..N</option>');

        var saveButton = $('<button>Kaydet</button>');
        var cancelButton = $('<button>İptal</button>');

        saveButton.css({
            'background-color': '#2ecc71',
            color: 'white',
            border: 'none',
            'border-radius': '3px',
            padding: '10px 20px',
            cursor: 'pointer',
            'margin-right': '10px',
            width: '45%'
        });

        cancelButton.css({
            'background-color': '#e74c3c',
            color: 'white',
            border: 'none',
            'border-radius': '3px',
            padding: '10px 20px',
            cursor: 'pointer',
            width: '45%'
        });

        selectionForm.append(relationshipLabel);
        selectionForm.append(relationshipSelect);
        selectionForm.append(cardinalityLabel);
        selectionForm.append(cardinalitySelect);
        selectionForm.append('<br><br>');
        selectionForm.append(saveButton);
        selectionForm.append(cancelButton);

        $('body').append(overlay);
        $('body').append(selectionForm);

        saveButton.on('click', () => {
            var selectedRelationshipId = relationshipSelect.val();
            var cardinality = cardinalitySelect.val();

            if (!selectedRelationshipId || !cardinality) {
                alert('Please select both a relationship and a cardinality value.');
                return;
            }

            var selectedLink = this.graph.getCell(selectedRelationshipId);

            selectedLink.label(0, {
                position: 0.5,
                attrs: {
                    text: {
                        text: cardinality,
                        fill: '#34495e',
                        fontSize: 16,
                        fontWeight: 'bold'
                    }
                }
            });

            selectedLink.attr('data/cardinality', cardinality);
            this.history.saveState();
            selectionForm.remove();
            overlay.remove();
        });

        cancelButton.on('click', () => {
            selectionForm.remove();
            overlay.remove();
        });
    }

    initiatePrimaryKeySelection(foreignKeyAttr) {
        alert('Click on a Primary Key attribute to reference it.');

        let handler = (cellView) => {
            const selectedAttr = cellView.model;
            if (selectedAttr instanceof joint.shapes.erd.Attribute && selectedAttr.attr('data/isPrimaryKey')) { //seçilen elemanın attribute ve primary key olduğunu doğrular
                foreignKeyAttr.attr('data/fkReference', selectedAttr.id); //yabancı anahtarın referansını birincil anahtar olarak ayarla

                const link = new joint.shapes.standard.Link();
                link.source(foreignKeyAttr);
                link.target(selectedAttr);
                link.attr({
                    line: {
                        stroke: '#9b59b6', //mor çizgi
                        strokeWidth: 2,
                        strokeDasharray: '5,5', //kesikli
                        targetMarker: {
                            type: 'path',
                            d: 'M 10 -5 0 0 10 5 Z',
                            fill: '#9b59b6'
                        }
                    }
                });
                link.addTo(this.graph);

                alert(`Foreign Key "${foreignKeyAttr.attr('data/attributeName')}" now references Primary Key "${selectedAttr.attr('data/attributeName')}".`);
                this.paper.off('cell:pointerclick', handler);
                this.history.saveState();
            }
        };

        this.paper.on('cell:pointerclick', handler);
    }

    deleteElement(cellView) {
        var element = cellView.model;

        // Eğer silinecek element bir entity ise
        if (element instanceof joint.shapes.erd.Entity) {
            var connectedLinks = this.graph.getConnectedLinks(element);
            connectedLinks.forEach((link) => {
                var targetElement = link.getTargetElement();
                if (targetElement && targetElement instanceof joint.shapes.erd.Attribute) {
                    targetElement.remove();
                }
                link.remove();
            });
        } else if (element instanceof joint.shapes.erd.Attribute || element instanceof joint.shapes.erd.Relationship) {
            // Attributelar veya ilişkiler direkt olarak silinir
            var connectedLinks = this.graph.getConnectedLinks(element);
            connectedLinks.forEach((link) => {
                link.remove();
            });
        }

        element.remove();
        this.history.saveState();

        if (this.deleteMode) {
            this.deleteMode = false;
            $('#delete-btn').css('background-color', '');
        }
    }

}
