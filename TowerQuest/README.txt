HANOI BELLS - Tower of Hanoi

hanoi-bells
|-- frontend
|   |-- index.html
|   |-- style.css
|   `-- script.js
`-- backend
    |-- hanoi.pl      (Tower of Hanoi solver in Prolog)
    `-- server.pl     (web server + /api/solve)

Run:
  1. Install SWI-Prolog (https://www.swi-prolog.org)
  2. cd backend
  3. swipl server.pl
  4. Open http://localhost:8080

If the backend is off, the game still works (the solver falls back to JavaScript).
