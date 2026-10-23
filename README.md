# StudySpot

StudySpot is a mobile web app that lets university students see how busy the libraries are before they go, log their study sessions with a QR code check-in, and see where their friends are studying, whenever they choose to share it. It includes points and a weekly ranking among friends to encourage consistent studying.

Project for the course Programming Lab [22356] · ISLA Gaia · 2026/2027.

Team: Lucía Claver Bolea and Miguel Salado Serrano.


## Planned project structure
```
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
```

This structure is the planned one and may change during Sprint 2.

## Requirements

- [XAMPP](https://www.apachefriends.org/) (Apache, PHP and MySQL)
- [Git](https://git-scm.com/)
- A [Mapbox](https://www.mapbox.com/) access token (free account)

## Running the project locally (work in progress)

The code is not implemented yet. These are the planned steps and they will be completed in Sprint 2.

1. Clone this repository inside the `htdocs` folder of XAMPP:
```
   git clone https://github.com/930089Luu/StudySpot 
```
2. Start **Apache** and **MySQL** from the XAMPP control panel.
3. Create a MySQL database called `studyspot` (for example from phpMyAdmin at `http://localhost/phpmyadmin`).
4. Import `database/schema.sql` into that database (the file will be added in Sprint 2).
5. Add your Mapbox token and the database credentials to the configuration file (to be defined in Sprint 2).
6. Open `http://localhost/studyspot/public/` in your browser.
