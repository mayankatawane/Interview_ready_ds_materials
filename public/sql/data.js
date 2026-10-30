// Small practice databases for the in-browser SQL runner (SQLite dialect).
// Each key is a database name used in ```sql run db=NAME blocks.
window.SQLDATA = {
  emp: {
    about: "A company: departments and employees (with salaries, managers and hire dates). HR has no employees; Om has no department.",
    sql: `
CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO departments VALUES (1,'Data Science'),(2,'Engineering'),(3,'Sales'),(4,'HR');
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, dept_id INTEGER, salary INTEGER, manager_id INTEGER, hire_date TEXT);
INSERT INTO employees VALUES
 (1,'Asha',1,150000,NULL,'2019-04-01'),
 (2,'Rohan',1,120000,1,'2020-07-15'),
 (3,'Meera',1,120000,1,'2021-01-10'),
 (4,'Kabir',1,95000,2,'2022-03-01'),
 (5,'Neha',2,160000,NULL,'2018-09-01'),
 (6,'Arjun',2,130000,5,'2019-11-20'),
 (7,'Priya',2,130000,5,'2020-02-14'),
 (8,'Vikram',2,110000,6,'2021-06-30'),
 (9,'Sara',2,140000,6,'2022-08-01'),
 (10,'Dev',3,90000,NULL,'2020-05-05'),
 (11,'Isha',3,70000,10,'2021-09-09'),
 (12,'Om',NULL,60000,10,'2023-01-02');`
  },
  shop: {
    about: "An online shop: customers, orders (completed / cancelled / returned), products, order_items and price_changes. Eshan and Farah never ordered.",
    sql: `
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, city TEXT, signup_date TEXT);
INSERT INTO customers VALUES
 (1,'Aman','Pune','2026-01-05'),(2,'Bela','Mumbai','2026-01-20'),(3,'Chirag','Pune','2026-02-03'),
 (4,'Diya','Delhi','2026-02-15'),(5,'Eshan','Mumbai','2026-03-01'),(6,'Farah','Pune','2026-03-10');
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, amount INTEGER, status TEXT);
INSERT INTO orders VALUES
 (101,1,'2026-01-06',1200,'completed'),(102,1,'2026-01-25',800,'cancelled'),(103,2,'2026-01-21',2500,'completed'),
 (104,1,'2026-02-10',1500,'completed'),(105,3,'2026-02-04',300,'completed'),(106,2,'2026-02-18',700,'returned'),
 (107,4,'2026-02-20',4000,'completed'),(108,3,'2026-03-02',900,'completed'),(109,1,'2026-03-05',600,'completed'),
 (110,4,'2026-03-15',1100,'cancelled'),(111,2,'2026-03-20',1800,'completed'),(112,3,'2026-03-28',2100,'completed');
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price INTEGER);
INSERT INTO products VALUES (1,'Notebook','Stationery',100),(2,'Pen','Stationery',20),(3,'Headphones','Electronics',1500),(4,'Charger','Electronics',800),(5,'Mug','Home',300);
CREATE TABLE order_items (order_id INTEGER, product_id INTEGER, qty INTEGER);
INSERT INTO order_items VALUES
 (101,1,4),(101,4,1),(102,4,1),(103,3,1),(103,2,5),(103,5,1),(103,1,2),(103,4,1),(104,3,1),(105,5,1),
 (106,5,2),(107,3,2),(107,4,1),(108,4,1),(108,1,1),(109,5,2),(110,3,1),(111,3,1),(111,5,1),(112,3,1),(112,5,2);
CREATE TABLE price_changes (product_id INTEGER, new_price INTEGER, change_date TEXT);
INSERT INTO price_changes VALUES (1,90,'2026-01-01'),(1,100,'2026-02-15'),(3,1400,'2026-01-10'),(3,1500,'2026-03-01'),(4,800,'2026-03-10');`
  },
  activity: {
    about: "A mobile app: logins (one row per login, so a user can appear twice on the same day) and events for a purchase funnel.",
    sql: `
CREATE TABLE logins (user_id INTEGER, login_date TEXT);
INSERT INTO logins VALUES
 (1,'2026-03-01'),(1,'2026-03-02'),(1,'2026-03-03'),(1,'2026-03-03'),(1,'2026-03-05'),(1,'2026-03-06'),(1,'2026-03-07'),(1,'2026-03-08'),(1,'2026-03-10'),
 (2,'2026-03-01'),(2,'2026-03-03'),(2,'2026-03-04'),
 (3,'2026-03-02'),(3,'2026-03-03'),(3,'2026-03-04'),(3,'2026-03-05'),(3,'2026-03-06'),
 (4,'2026-03-03'),
 (5,'2026-03-05'),(5,'2026-03-06');
CREATE TABLE events (user_id INTEGER, event TEXT, event_time TEXT);
INSERT INTO events VALUES
 (1,'view','2026-03-01 10:00'),(1,'cart','2026-03-01 10:05'),(1,'checkout','2026-03-01 10:07'),(1,'purchase','2026-03-01 10:09'),
 (2,'view','2026-03-01 11:00'),(2,'cart','2026-03-01 11:20'),
 (3,'view','2026-03-02 09:00'),
 (4,'view','2026-03-02 12:00'),(4,'cart','2026-03-02 12:03'),(4,'checkout','2026-03-02 12:10'),
 (5,'view','2026-03-03 08:30'),(5,'cart','2026-03-03 08:31'),(5,'checkout','2026-03-03 08:35'),(5,'purchase','2026-03-03 08:36'),
 (6,'view','2026-03-03 19:00'),
 (7,'view','2026-03-04 14:00'),(7,'cart','2026-03-04 14:02'),(7,'checkout','2026-03-04 14:04'),(7,'purchase','2026-03-04 14:05'),
 (8,'view','2026-03-04 16:00'),(8,'cart','2026-03-04 16:30');`
  },
  sales: {
    about: "Daily revenue by region. South has no row for 2026-03-04 (a missing day).",
    sql: `
CREATE TABLE daily_sales (sale_date TEXT, region TEXT, revenue INTEGER);
INSERT INTO daily_sales VALUES
 ('2026-03-01','North',100),('2026-03-02','North',120),('2026-03-03','North',90),('2026-03-04','North',150),
 ('2026-03-05','North',150),('2026-03-06','North',80),('2026-03-07','North',200),('2026-03-08','North',170),
 ('2026-03-01','South',60),('2026-03-02','South',75),('2026-03-03','South',75),
 ('2026-03-05','South',90),('2026-03-06','South',110),('2026-03-07','South',70),('2026-03-08','South',95);`
  },
  rx: {
    about: "Pharma field data: doctors (HCPs) with specialty and territory, and monthly prescriptions (trx) for two fictional brands.",
    sql: `
CREATE TABLE hcps (id INTEGER PRIMARY KEY, name TEXT, specialty TEXT, territory TEXT);
INSERT INTO hcps VALUES (1,'Dr Rao','Oncology','West'),(2,'Dr Iyer','Oncology','West'),(3,'Dr Khan','Haematology','East'),(4,'Dr Shah','Oncology','East'),(5,'Dr Paul','Oncology','West'),(6,'Dr Sen','Haematology','East');
CREATE TABLE rx (hcp_id INTEGER, brand TEXT, month TEXT, trx INTEGER);
INSERT INTO rx VALUES
 (1,'Brand A','2026-01',40),(1,'Brand A','2026-02',46),(1,'Brand A','2026-03',52),(1,'Brand B','2026-01',10),(1,'Brand B','2026-02',8),(1,'Brand B','2026-03',12),
 (2,'Brand A','2026-01',25),(2,'Brand A','2026-02',22),(2,'Brand A','2026-03',30),
 (3,'Brand B','2026-01',35),(3,'Brand B','2026-02',41),(3,'Brand B','2026-03',38),
 (4,'Brand A','2026-01',18),(4,'Brand A','2026-02',27),(4,'Brand A','2026-03',27),(4,'Brand B','2026-02',5),(4,'Brand B','2026-03',9),
 (5,'Brand A','2026-02',12),(5,'Brand A','2026-03',20);`
  }
};
