import { dataTypeColorMap } from './Constants.js';

export function defineERDShapes(joint) {
    joint.shapes.erd = {};

    joint.shapes.erd.Entity = joint.dia.Element.define('erd.Entity', {
        attrs: {
            body: {
                refWidth: '100%',
                refHeight: '100%',
                fill: '#f39c12', //sarı
                stroke: '#e67e22', //turuncu çerçeve
                strokeWidth: 2,
            },
            label: {
                text: 'Entity',
                refX: '50%',
                refY: '50%',
                textAnchor: 'middle',
                yAlignment: 'middle',
                fill: 'white',
                fontSize: 14,
                fontWeight: 'bold',
            }
        }
    }, {
        markup: [{
            tagName: 'rect',
            selector: 'body'
        }, {
            tagName: 'text',
            selector: 'label'
        }]
    });

    joint.shapes.erd.Attribute = joint.dia.Element.define('erd.Attribute', {
        attrs: {
            body: {
                refCx: '50%',
                refCy: '50%',
                refRx: '50%',
                refRy: '50%',
                fill: '#2ecc71', //yeşil
                stroke: '#27ae60', //koyu yeşil çerçeve
                strokeWidth: 2,
            },
            label: {
                text: 'Attribute',
                refX: '50%',
                refY: '50%',
                textAnchor: 'middle',
                yAlignment: 'middle',
                fill: 'white',
                fontSize: 16,
                fontWeight: 'bold',
            }
        }
    }, {
        markup: [{
            tagName: 'ellipse',
            selector: 'body'
        }, {
            tagName: 'text',
            selector: 'label'
        }]
    });

    joint.shapes.erd.Relationship = joint.dia.Element.define('erd.Relationship', {
        attrs: {
            body: {
                refPoints: '50,0 100,50 50,100 0,50',
                fill: '#3498db', //mavi
                stroke: '#2980b9',// koyu mavi çerçeve
                strokeWidth: 2,
            },
            label: {
                text: 'Relationship',
                refX: '50%',
                refY: '50%',
                textAnchor: 'middle',
                yAlignment: 'middle',
                fill: 'white',
                fontSize: 14,
                fontWeight: 'bold',
            }
        }
    }, {
        markup: [{
            tagName: 'polygon', //baklava dilimi
            selector: 'body'
        }, {
            tagName: 'text',
            selector: 'label'
        }]
    });
}
