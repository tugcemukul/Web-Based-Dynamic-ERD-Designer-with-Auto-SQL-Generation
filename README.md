# Web Based Dynamic ERD Designer with Auto SQL Generation

This project is a full-featured, Full Stack web application that allows users to create Entity-Relationship (ER) diagrams through a visual interface, manage these diagrams, and automatically generate SQL `CREATE TABLE` scripts from them.

![image](https://github.com/user-attachments/assets/e4d94700-323b-4756-9c4b-d375c36b50d4)

![image](https://github.com/user-attachments/assets/24c6e73b-de17-41f5-b6d0-9f73488f2a6e)

## 🎯 Project Goal

The primary goal of this application is to simplify and accelerate the database design process. Instead of writing code, users can create complex database schemas through drag-and-drop and menu interactions, save these schemas for later editing, and convert them into standard SQL code with a single click.

## ✨ Key Features

### 1. Visual ER Diagram Creation
- **Entity and Relationship Definition:** Easily create fundamental ERD components such as `Entity`, `Weak Entity`, `Relationship`, and `Attribute`.
- **Automatic Relationship Linking:** Automatically create a connection line between two selected entities using the `Relationship` button.
- **Attribute Management:** Add, edit, and delete attributes on entities via a context menu (right-click) or by double-clicking.
- **Data Type Color-Coding:** Attributes are displayed in different colors based on their data types (`string`, `integer`, `date`, etc.).
- **Cardinality Assignment:** Define and visually represent cardinalities such as `1:1`, `1:N`, and `N:N` on relationships.

### 2. Interactive and User-Friendly Interface
- **Drag-and-Drop:** Freely move all elements on the diagram and pan the canvas itself.
- **Context Menu:** Access quick actions like "Add Attribute" or "Set Cardinality" by right-clicking on entities and relationships.
- **Undo/Redo Support:** Undo and redo functionality is supported, especially for deletion operations.
- **Edit Mode:** Double-click on entity or attribute names to modify them.

### 3. Saving, Loading, and Management
- **Temporary Save:** Save and load diagrams temporarily in the browser using `LocalStorage`.
- **Persistent Storage:** Save diagrams to the database linked to a user account, allowing access from different devices.
- **File Export/Import:** Download created diagrams to your computer as a `.erd` JSON file and upload them later.
- **Diagram List:** A user interface to list and manage all saved diagrams for the logged-in user.

### 4. Advanced SQL Code Generation
- **Automatic Code Generation:** Instantly generate standard `CREATE TABLE` SQL scripts from the current diagram using the `generateSQLCode()` function.
- **Primary & Foreign Key Support:** Automatically identify primary keys for entities and foreign keys for relationships.
- **Cascade Operations:** Support for rules like `ON DELETE CASCADE` and `ON DELETE SET NULL` in relationships.
- **Junction Table Creation:** Automatically create the necessary intermediate tables for `N:N` relationships.
- **Code Management:** Buttons to show/hide the generated SQL code and copy it to the clipboard.

### 5. User Management and Security
- **Authentication:** Secure user registration and login system based on JWT (JSON Web Token).
- **Password Security:** User passwords are securely stored using a hash algorithm and a 10-iteration `salt`.

## 🛠️ Technologies Used

- **Frontend:**
  - JavaScript (ES6+)
  - JointJS: The core library for creating visual diagrams and handling interactions.
  - jQuery: For DOM manipulation and event handling.
  - HTML5 & CSS3: For the application's structure and styling.

- **Backend:**
  - Node.js: The server-side runtime environment.
  - Express.js: The web framework for API routing and management.
  - PostgreSQL: The relational database for storing diagram and user data.
  - JWT (jsonwebtoken): For user authentication and session management.

- **Other:**
  - LocalStorage: For temporary data storage in the browser.
  - JSON: The data transfer format between the frontend and backend.

## 🚀 Installation and Setup

Follow these steps to run the project on your local machine:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/tugcemukul/Web-Based-Dynamic-ERD-Designer-with-Auto-SQL-Generation.git
    cd Web-Based-Dynamic-ERD-Designer-with-Auto-SQL-Generation
    ```

2.  **Install Backend Dependencies:**
    ```bash
    cd backend
    npm install
    ```

3.  **Configure Database and Environment Variables:**
    - Create a `.env` file in the `backend` directory.
    - Fill in the following variables with your PostgreSQL and JWT settings:
      ```      DB_USER=postgres
      DB_HOST=localhost
      DB_DATABASE=your_db_name
      DB_PASSWORD=your_password
      DB_PORT=5432
      JWT_SECRET=your_secret_key
      ```

4.  **Start the Backend Server:**
    ```bash
    npm start
    ```
    The server will run on `http://localhost:3000` by default.

5.  **Open the Frontend:**
    - Open the `index.html` file from the root directory in a web browser.

## 🏗️ Architecture and Code Structure

The project was developed with a modular structure to enhance maintainability and scalability.

- **Class-Based Structure:** Instead of a single large file, the code is organized into separate classes with distinct responsibilities, such as `Entity`, `Diagram`, and `SQLGenerator`.
- **Full Stack Architecture:** The frontend (client-side) and backend (server-side) are clearly separated. This simplifies the development and maintenance processes.

## ✅ Project Status

All core functionalities of the project are active, fully tested, and working as expected. Users can successfully:
- Create, edit, and delete ER diagrams.
- Save their diagrams and load them back.
- Generate SQL code from the created diagrams.
- Assign relationships and cardinalities.

The user interface and experience have been finalized, and the project is considered complete.
