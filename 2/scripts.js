"use strict"

let todoList = [];
let PLACEHOLDER = env.PLACEHOLDER
let apiKey = env.X_MASTER_KEY
let jsonURL = env.BIN_URL

let initList = function () {
    let savedList = window.localStorage.getItem("todos");
    if (savedList != null && JSON.parse(savedList).length > 0) {
        todoList = JSON.parse(savedList);
    }
}

let initJSONbin = function () {
    let req = new XMLHttpRequest();
    req.onreadystatechange = () => {
        if (req.readyState === XMLHttpRequest.DONE) {
            console.log(req.responseText);
            let response = JSON.parse(req.responseText);
            if (response.record[0] !== PLACEHOLDER) {
                todoList = response.record;
            } else if (response.record[0] === PLACEHOLDER && response.record[1] !== undefined) {
                todoList = response.record.slice(1);
            }
        }
    };
    req.open("GET", jsonURL, true);
    req.setRequestHeader("X-Master-Key", apiKey);
    req.send();
}


let updateJSONbin = function () {
    if (todoList[0] === PLACEHOLDER && todoList[1] !== undefined) {
        todoList = todoList.slice(1);
    }
    let req = new XMLHttpRequest();
    req.onreadystatechange = () => {
        if (req.readyState === XMLHttpRequest.DONE) {
            console.log(req.responseText);
        }
    };
    req.open("PUT", jsonURL, true);
    req.setRequestHeader("Content-Type", "application/json");
    req.setRequestHeader("X-Master-Key", apiKey);
    req.send(JSON.stringify(todoList));
}


let updateTodoList = function () {
    let todoListDiv = document.getElementById("todoListTable");
    let infoMessage = document.getElementById("infoMessage");

    // usuń poprzednią zawartość
    while (todoListDiv.firstChild) {
        todoListDiv.removeChild(todoListDiv.firstChild);
    }

    if (todoList[0] !== PLACEHOLDER && todoList.length > 0) {
        let table = createTableHeader();
        let isTableCreated = createTableBody(table);
        if (isTableCreated) {
            infoMessage.style.display = "none";
            todoListDiv.appendChild(table);
        } else {
            infoMessage.textContent = "No tasks match filter option!";
            infoMessage.style.display = "block";
        }
    } else {
        infoMessage.textContent = "You don't have any tasks to do! You can take a rest now";
        infoMessage.style.display = "block";
    }

};

let createTableHeader = function () {
    let wrapper = document.createElement("div");
    wrapper.className = "table-responsive";

    let table = document.createElement("table");
    table.className = "table table-striped table-hover table-bordered align-middle text-center";

    let headerRow = document.createElement("tr");
    let headers = ["Title", "Description", "Place", "Category", "Due Date", ""];
    for (let h of headers) {
        let th = document.createElement("th");
        th.textContent = h;
        th.className = "table-light";
        headerRow.appendChild(th);
    }
    table.appendChild(headerRow);
    return table;
}

let createTableBody = function (table) {
    let taskFlag = false;
    for (let i = 0; i < todoList.length; i++) {
        let todo = todoList[i];
        if (tasksMatchesFilter(todo)) {
            taskFlag = true;
            let row = document.createElement("tr");
            row.appendChild(createTableDataCell(todo.title));
            row.appendChild(createTableDataCell(todo.description));
            row.appendChild(createTableDataCell(todo.place));
            row.appendChild(createTableDataCell(todo.category));
            row.appendChild(createTableDataCell(new Date(todo.dueDate).toLocaleDateString()));
            row.appendChild(createDeleteButtonDataCell(todo));
            table.appendChild(row);
        }
    }
    return taskFlag;
}

let tasksMatchesFilter = function (todo) {
    let filterInput = document.getElementById("inputSearch").value.toLowerCase();
    let filterStartDate = document.getElementById("startDate").value;
    let filterEndDate = document.getElementById("endDate").value;
    let todoCutDate = new Date(todo.dueDate).toISOString().split('T')[0];
    if (filterStartDate && filterStartDate > todoCutDate) {
        return false;
    }
    if (filterEndDate && filterEndDate < todoCutDate) {
        return false;
    }
    if (filterInput === "") {
        return true;
    }
    if (todo.title.toLowerCase().includes(filterInput)) {
        return true;
    }
    return todo.description.toLowerCase().includes(filterInput);
}

let createDeleteButtonDataCell = function (todo) {
    let deleteButtonDataCell = document.createElement("td");
    deleteButtonDataCell.className = "text-center";
    let deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "btn btn-outline-danger btn-sm";

    deleteButton.addEventListener("click", function () {
        deleteTodo(todo);
    });
    deleteButtonDataCell.appendChild(deleteButton);
    return deleteButtonDataCell;
}

let createTableDataCell = function (value) {
    let element = document.createElement("td");
    element.textContent = value;
    return element;
}

let deleteTodo = function (index) {
    todoList.splice(index, 1);
    window.localStorage.setItem("todos", JSON.stringify(todoList));
    if (todoList.length === 0) {
        todoList.push(PLACEHOLDER);
    }
    updateTodoList();
    updateJSONbin();
}

let addTodo = function () {
    let inputTitle = document.getElementById("inputTitle");
    let inputDescription = document.getElementById("inputDescription");
    let inputPlace = document.getElementById("inputPlace");
    let inputDate = document.getElementById("inputDate");

    let newTitle = inputTitle.value;
    let newDescription = inputDescription.value;
    let newPlace = inputPlace.value;
    let newDate = new Date(inputDate.value);

    if (newTitle && newDescription && newPlace && inputDate.value) {
        let newTodo = {
            title: newTitle, description: newDescription, place: newPlace, category: '', dueDate: newDate
        };
        todoList.push(newTodo);
        window.localStorage.setItem("todos", JSON.stringify(todoList));
        updateJSONbin();
    } else alert("Please fill in all information!");
}
initList();
initJSONbin();
setInterval(updateTodoList, 1000);


