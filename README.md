# StudySpot

StudySpot is a mobile web app that lets university students see how busy the libraries are before they go, log their study sessions with a QR code check-in, and see where their friends are studying, whenever they choose to share it. It includes points and a weekly ranking among friends to encourage consistent studying.

Project for the course Programming Lab [22356] · ISLA Gaia · 2026/2027.

Team: Lucía Claver Bolea and Miguel Salado Serrano.


## Planned project structure

studyspot/
├── public/            User interface (HTML, CSS, JavaScript, Mapbox map)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── img/
├── api/               PHP endpoints (register, login, check-in, check-out, occupancy...)
├── src/               Application logic
│   ├── Ocupacion/     Occupancy estimation module
│   ├── Gamificacion/  Points, weekly ranking and weekly goal module
│   └── Database/      MySQL connection (PDO, prepared statements)
├── database/
│   └── schema.sql     Table creation script
├── docs/              Sprint documents, diagrams and wireframes
└── README.md

This structure is the planned one and may change during Sprint 2.
