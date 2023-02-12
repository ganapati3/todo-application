const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const isValid = require("date-fns/isValid");
const format = require("date-fns/format");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");
let db;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server starting at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
};

initializeDBAndServer();

// Get Todo list API

const hasStatus = (query) => {
  return query.status !== undefined;
};
const hasPriority = (query) => {
  return query.priority !== undefined;
};
const hasStatusAndPriority = (query) => {
  return query.priority !== undefined && query.status !== undefined;
};
const hasCategoryAndStatus = (query) => {
  return query.category !== undefined && query.status !== undefined;
};
const hasCategory = (query) => {
  return query.category !== undefined;
};
const hasCategoryAndPriority = (query) => {
  return query.category !== undefined && query.priority !== undefined;
};

app.get("/todos/", async (request, response) => {
  const { search_q = "", status, category, priority } = request.query;
  let getBookQuery = "";
  switch (true) {
    case hasStatus(request.query):
      getBookQuery = `
        SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
         FROM 
        todo
        WHERE
        todo LIKE '%${search_q}%' AND
        status = '${status}';`;
      break;
    case hasPriority(request.query):
      getBookQuery = `
        SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
         FROM 
        todo
        WHERE
        todo LIKE '%${search_q}%' AND
        priority = '${priority}';`;
      break;
    case hasStatusAndPriority(request.query):
      getBookQuery = `
        SELECT
         id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
         FROM 
        todo
        WHERE
        todo LIKE '%${search_q}%' AND
        status = '${status}'AND
        priority = '${priority}';`;
      break;
    case hasCategoryAndStatus(request.query):
      getBookQuery = `
        SELECT
         id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
         FROM 
        todo
        WHERE
        todo LIKE '%${search_q}%' AND
        status = '${status}'AND
        category = '${category}';`;
      break;
    case hasCategory(request.query):
      getBookQuery = `
        SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
         FROM 
        todo
        WHERE
        todo LIKE '%${search_q}%' AND
        category = '${category}';`;
      break;
    case hasCategoryAndPriority(request.query):
      getBookQuery = `
        SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
         FROM 
        todo
        WHERE
        todo LIKE '%${search_q}%' AND
        category = '${category}'AND
        priority = '${priority}';`;
      break;
    default:
      getBookQuery = `
        SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
         FROM 
        todo
        WHERE
        todo LIKE '%${search_q}%';`;
      break;
  }
  const todoList = await db.all(getBookQuery);
  response.send(todoList);
});

// Get a todo list API

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getBookQuery = `
        SELECT
         id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
         FROM 
        todo
        WHERE
        id = ${todoId};`;
  const todoList = await db.get(getBookQuery);
  response.send(todoList);
});

// get todo list API

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const result = isValid(new Date(date));
  if (result) {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    const getBookQuery = `
        SELECT
         id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
         FROM 
        todo
        WHERE
        due_date = '${newDate}';`;
    const todoList = await db.all(getBookQuery);
    response.send(todoList);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

// create new todo API

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const addTodoQuery = `
    INSERT INTO 
    todo
    (id,todo,priority,status,category,due_date)
    VALUES (
        ${id},
        '${todo}',
        '${priority}',
        '${status}',
        '${category}',
        '${dueDate}'
        );`;
  await db.run(addTodoQuery);
  response.send("Todo Successfully Added");
});

// update Todo API
const checkPriority = async (request, response, next) => {
  const { priority } = request.body;
  const priorityList = ["HIGH", "MEDIUM", "LOW"];
  const checkList =
    priorityList.includes(priority) === false && priority !== undefined;
  if (checkList) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else {
    next();
  }
};
const checkStatus = async (request, response, next) => {
  const { status } = request.body;
  const statusList = ["TO DO", "IN PROGRESS", "DONE"];
  const checkList =
    statusList.includes(status) === false && status !== undefined;
  if (checkList) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else {
    next();
  }
};
const checkCategory = async (request, response, next) => {
  const { category } = request.body;
  const categoryList = ["WORK", "HOME", "LEARNING"];
  const checkList =
    categoryList.includes(category) === false && category !== undefined;
  if (checkList) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    next();
  }
};
const checkDate = async (request, response, next) => {
  const { date } = request.body;
  const result = isValid(new Date(date));
  if (result && date !== undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};

app.put(
  "/todos/:todoId/",
  checkPriority,
  checkStatus,
  checkCategory,
  checkDate,
  async (request, response) => {
    const { todoId } = request.params;
    const { todo, priority, status, category, dueDate } = request.body;
    let responseData = "";
    let updateQuery = "";

    switch (true) {
      case todo !== undefined:
        updateQuery = `
                UPDATE
                todo
                SET
                todo = '${todo}'
                WHERE
                id = ${todoId};`;
        responseData = "Todo Updated";
        break;
      case priority !== undefined:
        updateQuery = `
        UPDATE
        todo
        SET
        priority = '${priority}'
        WHERE
        id = ${todoId};`;
        responseData = "Priority Updated";
        break;
      case status !== undefined:
        updateQuery = `
        UPDATE
        todo
        SET
        status = '${status}'
        WHERE
        id = ${todoId};`;
        responseData = "Status Updated";
        break;
      case category !== undefined:
        updateQuery = `
        UPDATE
        todo
        SET
        category = '${category}'
        WHERE
        id = ${todoId};`;
        responseData = "Category Updated";
        break;
      case dueDate !== undefined:
        updateQuery = `
        UPDATE
        todo
        SET
        due_date = '${dueDate}'
        WHERE
        id = ${todoId};`;
        responseData = "Priority Updated";
        break;
      default:
        break;
    }
    await db.run(updateQuery)
    response.send(responseData)
  
});

module.exports = app