export class UIManager {
    showDiagram() {
        $('#diagram-container').show();
        $('#show-diagram').hide(); //butonu gizle
        $('#hide-diagram').show(); //butonu göster
    }

    hideDiagram() {
        $('#diagram-container').hide();
        $('#show-diagram').show();
        $('#hide-diagram').hide();
    }

    showSQLCode() {
        $('#sql-code-container').show();
        $('#hide-sql').show();
        $('#show-sql').hide();
    }

    hideSQLCode() {
        $('#sql-code-container').hide();
        $('#show-sql').show();
        $('#hide-sql').hide();
    }
}
