console.log('main.js çalıştı!');
import  {defineERDShapes} from './ERDShapes.js';
import  {UIManager}  from './UIManager.js';
import  {StorageManager}  from './StorageManager.js';
import {SQLGenerator}  from './SQLGenerator.js';
import  {DiagramManager}  from './DiagramManager.js';


let globalDiagramId=-2;
let globalDiagramName = null;
function decodeToken(token) {
    if (!token) return null;

    const payload = token.split('.')[1]; // JWT'nin ikinci kısmı (payload)
    const decoded = atob(payload); // Base64 çözümleme
    return JSON.parse(decoded); // JSON formatına çevir
}

$(document).ready(function () {
    var graph = new joint.dia.Graph();
    var paper = new joint.dia.Paper({
        el: $('#diagram-container'),
        model: graph,
        width: 1200,
        height: 800,
        gridSize: 10,
        drawGrid: true,
        interactive: {
            linkMove: false,
            elementMove: true
        }
    });
    const sidebar = $('#diagram-list');
    const listDiagramsButton = $('#list-diagrams');
    const closeDiagramListButton = $('#close-diagram-list');

    defineERDShapes(joint);

    const uiManager = new UIManager();
    const storageManager = new StorageManager();
    const sqlGenerator = new SQLGenerator();
    const diagramManager = new DiagramManager(graph, paper);


    $('#diagram-container').on('click', function (event) {
        if (diagramManager.addEntityMode) { //varlık ekleme
            var offsetX = event.offsetX;
            var offsetY = event.offsetY;
            diagramManager.addEntity(offsetX, offsetY);
            diagramManager.addEntityMode = false;
            $('#add-table').css('background-color', '#9b59b6');
        } else if (diagramManager.addRelationshipMode) { //ilişki ekleme
            var offsetX = event.offsetX;
            var offsetY = event.offsetY;
            diagramManager.addRelationship(offsetX, offsetY);
            diagramManager.addRelationshipMode = false;
            $('#add-relationship').css('background-color', '#9b59b6');
        }
    });
    // Buton Eventleri
    $('#add-table').on('click', function () {
        console.log(diagramManager.addEntityMode);
        diagramManager.addEntityMode = true;
        console.log(diagramManager.addEntityMode);
        $('#add-table').css('background-color', '#2ecc71');
    });

    $('#add-relationship').on('click', function () {
        diagramManager.addRelationshipMode = true;
        $('#add-relationship').css('background-color', '#2ecc71');
    });

    $('#delete-btn').on('click', function () {
        diagramManager.deleteMode = !diagramManager.deleteMode;
        diagramManager.persistentDeleteMode = false;
        if (diagramManager.deleteMode) {
            $('#delete-btn').css('background-color', 'yellow');
        } else {
            $('#delete-btn').css('background-color', '');
        }
    });

    $('#delete-btn').on('dblclick', function () {
        diagramManager.persistentDeleteMode = !diagramManager.persistentDeleteMode;
        diagramManager.deleteMode = false;
        if (diagramManager.persistentDeleteMode) {
            $('#delete-btn').css('background-color', 'red');
        } else {
            $('#delete-btn').css('background-color', '');
        }
    });

    $('#undo-btn').on('click', () => diagramManager.history.undo());
    $('#redo-btn').on('click', () => diagramManager.history.redo());

    $('#save-diagram').on('click', () => storageManager.saveDiagram(graph));
    $('#update-diagram').on('click', () => storageManager.updateDiagram(graph,globalDiagramName));

    $('#copy-sql-btn').on('click', () => {
        const sqlCode = $('#sql-code').text(); // SQL kodunu al
        if (!sqlCode) {
            alert('No SQL Code Generated!');
            return;
        }

        // Panoya kopyala
        navigator.clipboard.writeText(sqlCode).then(() => {
            alert('SQL Code is Copied!');
        }).catch(err => {
            console.error('An Error Occured on Copying SQL Code:', err);
            alert('An Error Occured on Copying SQL Code!');
        });
    });
    $('#load-diagram').on('click', async () => {

        if (globalDiagramId<0) {
            alert('Please Select Your Diagram!');
            listDiagrams();
            return;
        }
        await storageManager.loadDiagram(globalDiagramId,graph);
    });

    $('#load-diagramfromList').on('click', async () => {

        if (globalDiagramId<0) {
            alert('Please Select Your Diagram!');
            return;
        }
        await storageManager.loadDiagram(globalDiagramId,graph);
    });
    // Sidebar'ı açma işlevi
    function openSidebar() {
        $('#diagram-list').addClass('active');
    }

// Sidebar'ı kapatma işlevi
    function closeSidebar() {
        $('#diagram-list').removeClass('active');
    }

// Sidebar'ı açma işlevi
    function openSidebar() {
        sidebar.addClass('active'); // "active" sınıfı sidebar'ı açar
    }

    // Sidebar'ı kapatma işlevi
    function closeSidebar() {
        sidebar.removeClass('active'); // "active" sınıfı kaldırılır ve sidebar gizlenir
    }

    // List diagrams butonuna tıklandığında çalışır
    listDiagramsButton.on('click', async () => {
        try {
            const token = localStorage.getItem('token'); // Kullanıcı token'ı
            const decodedToken = decodeToken(token); // Token'dan kullanıcı ID'sini çözümle
            const userId = decodedToken?.userId;

            if (!userId) {
                alert('User not authenticated!');
                return;
            }

            await storageManager.listDiagrams(userId); // Diagramları listele
            const diagramLocal = localStorage.getItem('listdiagram');
            const diagrams = JSON.parse(diagramLocal);
            console.log('Diagrams:', diagrams);

            // İlk olarak "Selected Diagram Name" kısmını oluştur
            if (!$('#selected-diagram').length) {
                const selectedDiagramContainer = `
                <div id="selected-diagram-container" class="font-size: 6px, sidebar-header">
                    <p><strong>Selected Diagram Name:</strong> <span id="selected-diagram">No diagram selected</span></p>
                </div>
            `;
                $('#diagram-list').prepend(selectedDiagramContainer);
            }

            if (diagrams && diagrams.length > 0) {
                const listHtml = diagrams
                    .map(diagram => `
                <li data-id="${diagram.id}" class="diagram-item">
                    <strong>${diagram.name || 'Unnamed Diagram'}</strong>
                    <small>Created At: ${new Date(diagram.created_at).toLocaleString()}</small>
                </li>
            `).join('');

                $('#diagram-list ul').html(listHtml);

                // Liste elemanlarına olay bağlama
                $('.diagram-item').on('click', function () {
                    const diagramId = $(this).data('id');
                    const diagramName = $(this).find('strong').text();
                    globalDiagramId = diagramId;
                    globalDiagramName=diagramName;

                    // "Selected Diagram Name" kısmını güncelle
                    $('#selected-diagram').text(diagramName);
                });
            } else {
                $('#diagram-list ul').html('<p>No diagrams found.</p>');

                // Eğer liste boşsa "No diagram selected" yazısını güncelle
                $('#selected-diagram').text('No diagram selected');
            }

            openSidebar(); // Sidebar'ı aç
        } catch (error) {
            console.error('Error loading diagrams:', error.message);
            alert('Failed to load diagrams.');
        }
    });

    // Sidebar kapatma butonuna tıklandığında çalışır
    closeDiagramListButton.on('click', () => {
        closeSidebar();
    });

    //diagram sildikten sonra diagramlarin guncellenmesi icin eklenen fonksiyon, listdiagramsbutton ile ayni isleve sahip
    async function listDiagrams() {
        try {
            const token = localStorage.getItem('token'); // Kullanıcı token'ı
            const decodedToken = decodeToken(token); // Token'dan kullanıcı ID'sini çözümle
            const userId = decodedToken?.userId;

            if (!userId) {
                alert('User not authenticated!');
                return;
            }

            await storageManager.listDiagrams(userId); // Diagramları listele
            const diagramLocal = localStorage.getItem('listdiagram');
            const diagrams = JSON.parse(diagramLocal);
            console.log('Diagrams:', diagrams);

            // İlk olarak "Selected Diagram Name" kısmını oluştur
            if (!$('#selected-diagram').length) {
                const selectedDiagramContainer = `
                <div id="selected-diagram-container" class="font-size: 6px, sidebar-header">
                    <p><strong>Selected Diagram Name:</strong> <span id="selected-diagram">No diagram selected</span></p>
                </div>
            `;
                $('#diagram-list').prepend(selectedDiagramContainer);
            }

            if (diagrams && diagrams.length > 0) {
                const listHtml = diagrams
                    .map(diagram => `
                <li data-id="${diagram.id}" class="diagram-item">
                    <strong>${diagram.name || 'Unnamed Diagram'}</strong>
                    <small>Created At: ${new Date(diagram.created_at).toLocaleString()}</small>
                </li>
            `).join('');

                $('#diagram-list ul').html(listHtml);

                // Liste elemanlarına olay bağlama
                $('.diagram-item').on('click', function () {
                    const diagramId = $(this).data('id');
                    const diagramName = $(this).find('strong').text();
                    globalDiagramId = diagramId;
                    globalDiagramName=diagramName;

                    // "Selected Diagram Name" kısmını güncelle
                    $('#selected-diagram').text(diagramName);
                });
            } else {
                $('#diagram-list ul').html('<p>No diagrams found.</p>');

                // Eğer liste boşsa "No diagram selected" yazısını güncelle
                $('#selected-diagram').text('No diagram selected');
            }

            openSidebar(); // Sidebar'ı aç
        } catch (error) {
            console.error('Error loading diagrams:', error.message);
            alert('Failed to load diagrams.');
        }
    }
    // DELETE Diagram İşlevi
    $('#delete-diagram').on('click', async () => {
        if (globalDiagramId < 0) {
            alert('Please select a diagram to delete!');
            return;
        }

        const confirmation = confirm('Are you sure you want to delete this diagram? This action cannot be undone.');
        if (!confirmation) return;

        try {
            const token = localStorage.getItem('token'); // Kullanıcı token'ı
            console.log(token);
            const response = await fetch(`http://localhost:5007/api/diagrams/${globalDiagramId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log(response);
            if (response.ok) {
                alert('Diagram deleted successfully!');
                $('#diagram-list ul').html('<p>No diagrams found.</p>'); // Listeyi temizle
                globalDiagramId = -1; // Seçili diagram ID'sini sıfırla

            } else {
                const error = await response.json();
                alert(`Failed to delete diagram: ${error.error}`);
            }

            await listDiagrams();
        } catch (error) {
            console.error('Error deleting diagram:', error.message);
            alert('An error occurred while deleting the diagram.');
        }
    });

    $('#generate-sql').on('click', function () {
        const diagramJSON = JSON.parse(localStorage.getItem('erDiagram'));
        if (!diagramJSON) {
            alert('Please save the diagram first.');
            return;
        }
        const sqlCode = sqlGenerator.generateSQLCode(diagramJSON);
        console.log(sqlCode);
        // Anahtar kelimeler ve veri türlerini renklendirme
        const highlightedSQL = sqlCode
            .replace(/\b(CREATE TABLE|PRIMARY KEY|FOREIGN KEY|REFERENCES|ON DELETE|ON UPDATE)\b/g, '<span class="keyword">$1</span>')
            .replace(/\b(INT|VARCHAR|BOOLEAN|CHAR)\b/g, '<span class="datatype">$1</span>')
            .replace(/--(.*)$/gm, '<span class="comment">--$1</span>'); // SQL yorumlarını renklendirme

        // <pre> içine renklendirilmiş HTML'i ekleme
        $('#sql-code').html(highlightedSQL);
        $('#sql-code-container').fadeIn();
        uiManager.hideDiagram();
        uiManager.showSQLCode();
    });


    $('#show-diagram').on('click', () => uiManager.showDiagram());
    $('#hide-diagram').on('click', () => uiManager.hideDiagram());
    $('#show-sql').on('click', () => uiManager.showSQLCode());
    $('#hide-sql').on('click', () => uiManager.hideSQLCode());

    $('#clear-diagram').on('click', function () {
        if (confirm('Are you sure you want to clear the entire diagram? This action cannot be undone.')) {
            graph.clear();
            alert('The diagram has been cleared.');
        }
    });

    // Zoom Eventleri
    $('#diagram-container').on('wheel', function (event) {
        event.preventDefault();

        if (event.originalEvent.deltaY < 0) {
            diagramManager.zoomLevel = Math.min(diagramManager.maxZoom, diagramManager.zoomLevel + diagramManager.zoomStep);
        } else {
            diagramManager.zoomLevel = Math.max(diagramManager.minZoom, diagramManager.zoomLevel - diagramManager.zoomStep);
        }

        paper.scale(diagramManager.zoomLevel, diagramManager.zoomLevel);
    });

    // Panning Eventleri
    $('#diagram-container').on('mousedown', function (event) {
        if (!$(event.target).closest('.joint-cell').length) {
            diagramManager.isPanning = true;
            diagramManager.panStartPosition = { x: event.pageX, y: event.pageY };
        }
    });

    $(document).on('mousemove', function (event) {
        if (!diagramManager.isPanning) return;

        var dx = event.pageX - diagramManager.panStartPosition.x;
        var dy = event.pageY - diagramManager.panStartPosition.y;

        var currentTranslation = paper.translate();
        paper.translate(currentTranslation.tx + dx, currentTranslation.ty + dy);

        diagramManager.panStartPosition = { x: event.pageX, y: event.pageY };
    });

    $(document).on('mouseup', function () {
        diagramManager.isPanning = false;
    });

    $('#save-to-desktop').on('click', () => {
        const diagramName = prompt('Enter a name for your diagram:');
        if (!diagramName) {
            alert('Diagram name is required!');
            return;
        }

        const graphJSON = graph.toJSON(); // Diagramın JSON formatı
        const fileContent = JSON.stringify(graphJSON, null, 2); // JSON'u düzenli bir şekilde stringify et
        const blob = new Blob([fileContent], { type: 'application/json' }); // Blob oluştur
        const fileName = `${diagramName}.erd`; // Dosya adı ve uzantısı

        // İndirilebilir bir link oluştur
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();

        // Linki serbest bırak
        URL.revokeObjectURL(link.href);
    });

    $('#load-from-desktop').on('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.erd'; // Sadece .erd uzantılı dosyaları kabul et

        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const fileContent = await file.text(); // Dosyanın içeriğini oku
                const diagramJSON = JSON.parse(fileContent); // JSON formatına çevir
                localStorage.setItem('erDiagram', fileContent); // localStorage'a kaydet
                graph.fromJSON(diagramJSON); // Diagramı yükle
                alert('Diagram loaded successfully!');
            } catch (error) {
                alert('Failed to load diagram. Ensure the file is a valid .erd file.');
                console.error(error);
            }
        };

        input.click(); // Dosya seçme penceresini aç
    });
});
