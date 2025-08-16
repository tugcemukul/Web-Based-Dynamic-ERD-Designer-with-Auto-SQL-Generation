export class HistoryManager {
    constructor(graph) {
        this.graph = graph;
        this.undoStack = [];
        this.redoStack = [];
    }

    saveState() {
        this.undoStack.push(this.graph.toJSON());
        this.redoStack = []; //yeni işlem yapıldığında redoyu sıfırla
    }

    undo() {
        if (this.undoStack.length > 0) { //kullanıcının son yaptığı işlemi geri alır
            this.redoStack.push(this.graph.toJSON());
            var previousState = this.undoStack.pop(); //bir önceki adıma geri dönmek için pop
            this.graph.fromJSON(previousState);
        }
    }

    redo() {
        if (this.redoStack.length > 0) { //kullaıcının geri aldığı işlemi tekrar uygular
            this.undoStack.push(this.graph.toJSON());
            var nextState = this.redoStack.pop(); //bir sonraki adıma dönmek için pop
            this.graph.fromJSON(nextState);
        }
    }
}
