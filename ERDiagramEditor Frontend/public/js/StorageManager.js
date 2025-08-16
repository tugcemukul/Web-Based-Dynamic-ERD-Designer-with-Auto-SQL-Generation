function decodeToken(token) {
    if (!token) return null;

    const payload = token.split('.')[1]; // JWT'nin ikinci kısmı (payload)
    const decoded = atob(payload); // Base64 çözümleme
    return JSON.parse(decoded); // JSON formatına çevir bunu
}

export class StorageManager {



    async saveDiagram(graph) {
        // Diagram JSON verisini oluştur
        const content = JSON.stringify(graph.toJSON()); // Graph objesini JSON string'e çevir
        const name = prompt('Please enter a name for your diagram:'); // Kullanıcıdan diagram adı al
        localStorage.setItem('erDiagram', content);
        if (!name) {
            alert('Diagram name is required!');
            return;
        }


        const token = localStorage.getItem('token'); // Kullanıcı token'ı
        const decodedToken = decodeToken(token); // JWT'den kullanıcı bilgilerini çöz
        const user_id = decodedToken?.userId; // userId'yi al

        // API'ye POST isteği yap
        const response = await fetch('http://localhost:5007/api/diagrams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ user_id, name, content })
        });

        if (response.ok) {
            alert('Diagram saved successfully');
        } else {
            const error = await response.json();
            alert(error.error);
        }
    }

    async updateDiagram(graph,diagramName) {
        // Diagram JSON verisini oluştur
        const content = JSON.stringify(graph.toJSON()); // Graph objesini JSON string'e çevir
        const name =  diagramName;

        if(diagramName==null) {
            alert('No diagram selected!');
            return;
        }
        if(!confirm(`Are you sure you want to update "${name}" diagram?`)) {
            return;
        }
        localStorage.setItem('erDiagram', content);
        if (!name) {
            alert('Diagram name is required!');
            return;
        }


        const token = localStorage.getItem('token'); // Kullanıcı token'ı
        const decodedToken = decodeToken(token); // JWT'den kullanıcı bilgilerini çöz
        const user_id = decodedToken?.userId; // userId'yi al

        // API'ye POST isteği yap
        const response = await fetch('http://localhost:5007/api/diagrams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ user_id, name, content })
        });

        if (response.ok) {
            alert('Diagram saved successfully');
        } else {
            const error = await response.json();
            alert(error.error);
        }
    }

  

    async loadDiagram(diagramId,graph) {
        const token = localStorage.getItem('token'); // Token'ı al
        const decodedToken = decodeToken(token); // Token'ı çözümle
        const user_id = decodedToken?.userId; // Kullanıcı ID'sini al

        if (!user_id) {
            alert('User not authenticated!');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5007/api/diagrams/${diagramId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` // Token'ı Authorization başlığına ekle
                }
            });

            if (response.ok) {
                const diagram = await response.json();
                localStorage.setItem('erDiagram', JSON.stringify(diagram.content)); // Diagramı localStorage'a kaydet

                console.log(diagram.content);
                graph.fromJSON(diagram.content);

                console.log(diagram);
            } else {
                const error = await response.json();
                alert(error.error);
            }
        } catch (error) {
            alert(`Failed to load diagram: ${error.message}`);
        }
    }

    async listDiagrams() {
        const token = localStorage.getItem('token'); // Token'ı al
        const decodedToken = decodeToken(token); // Token'ı çözümle
        const user_id = decodedToken?.userId; // Kullanıcı ID'sini al

        if (!user_id) {
            alert('User not authenticated!');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5007/api/diagrams`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` // Token'ı Authorization başlığına ekle
                }
            });

            if (response.ok) {
                const diagrams = await response.json();
                localStorage.setItem('listdiagram', JSON.stringify(diagrams)); // Diagramı localStorage'a kaydet
                console.log(diagrams);
            } else {
                const error = await response.json();
                alert(error.error);
            }
        } catch (error) {
            alert(`Failed to list diagrams: ${error.message}`);
        }
    }


}
