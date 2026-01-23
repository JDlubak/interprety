# Applications in the Interpreted Languages
#### Mainly JavaScript, including HTML, CSS, as well as Vue for frontend applicaiton
## Introduction

\[EN]
This repository contains assignments from the course “Applications in the Interpreted Languages” at Technical University of Lodz - 5th semester at Applied Computer Science major, Software Engineering and Data Analysis specialization. Solutions were created by myself:

* [@JDlubak](https://github.com/JDlubak)

[PL]
Repozytorium zawiera rozwiązania zadań w ramach realizacji przedmiotu "Aplikacje w językach interpretowanych" na Politechnice Łódzkiej - 5 semestr na kierunku Informatyka Stosowana, specjalizacja Inżynieria Oprogramowania i Analiza Danych. Rozwiązania utworzyłem sam:

* [@JDlubak](https://github.com/JDlubak)

## Tasks done

### Simple bus page

We were asked to prepare simple HTML page which show a vehicle, and style the document using CSS.

### MyToDo App

I prepared an application using JS + HTML + CSS, in which we allow user to create, display, search and delete tasks from their TODO list.
It is integrated with JSONBin.IO API so that data can be accessed using different browser sessions.
Advanced app functionalities include filtering, or integrating with AI model to generate category to created task.

### order_app (including order_app API)

This task, was split into two parts. In first section, I prepared an API, which was going to be used later while implementing client-side application.
Order_app is supposed to show some kind of store, where customers can place orders on items from database. 
Advanced validation functions had to be implemented to ensure client was not able to provide incorrect data.
We have 2 different roles in application - worker and customer. 
As mentioned earlier, customers buy items, but they can also see their order history, cancel unconfirmed orders, and rate their orders.
Workers are not able to purchase anything, but they can initialize database if it is empty, create new products, as well as process customers orders - by confirming, completing or cancelling them.
They can also see ratings from all customers. Advanced functionalities of the application include registration and login, as well as integrating with Groq in order to generate a description for a product - which was specified as additional requirement for the task.
