CREATE TABLE roles (
    role_id INT PRIMARY KEY NOT NULL,
    role_name varchar check (role_name in ('user', 'admin', 'checker', 'maker')) NOT null
);
 
CREATE TABLE risk (
    risk_id INT NOT NULL PRIMARY KEY ,
    score INT NOT NULL,
    description VARCHAR(255) NOT NULL
);

CREATE TABLE users (
    user_id SERIAL NOT NULL PRIMARY KEY,
    role_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    user_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP not NULL,
    last_sign_in timestamp,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

create table users_balance (
    users_balance_id SERIAL NOT NULL PRIMARY KEY,
    user_id INT NOT null,
    balance float8 NOT NULL,
    created_at timestamp NOT NULL,
    modified_at timestamp NOT null,
    foreign key (user_id) references users(user_id)
);

CREATE TABLE user_details (
    user_details_id SERIAL NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    risk_id INT NOT NULL,
    fullname VARCHAR(60) NOT NULL,
    occupation VARCHAR(255) NOT NULL,
    addresses VARCHAR(255) NOT NULL,
    monthly_salary float8 NOT NULL,
    created_at timestamp NOT NULL,
    modified_at timestamp NOT null,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (risk_id) REFERENCES risk(risk_id)
);


-- Your existing table structure is correct
CREATE TABLE loan (
    loan_id SERIAL NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    principle float8 NOT NULL,
    interest float8 NOT NULL,
    term INT NOT NULL,
    repayment_plan JSONB,  -- JSONB for better performance
    created_at timestamp NOT NULL,
    modified_at timestamp NOT NULL,
    loan_status varchar check (loan_status in ('approved', 'rejected', 'waiting approval')) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE installment (
    installment_id SERIAL NOT NULL PRIMARY KEY,
    loan_id INT NOT NULL,
    term INT NOT NULL,
    principle float8 NOT NULL,
    interest float8 NOT NULL,
    fee float8 not null,
    outstanding_amount float8 NOT NULL,
    created_at timestamp NOT NULL,
    modified_at timestamp NOT NULL,
    due_date DATE NOT NULL,
    FOREIGN KEY (loan_id) REFERENCES loan(loan_id)
);

CREATE TABLE repayment (
    repayment_id SERIAL NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    installment_id INT NOT NULL,
    loan_id INT NOT NULL,
    amount float8 NOT NULL,
    returned_amount float8,
    created_at timestamp NOT NULL,
    modified_at timestamp NOT null,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (installment_id) REFERENCES installment(installment_id),
    FOREIGN KEY (loan_id) REFERENCES loan(loan_id)
);

CREATE TABLE loan_limit (
    limit_id SERIAL NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    limit_amount float8 NOT NULL,
    available_amount float8 NOT NULL,
    created_at timestamp NOT NULL,
    modified_at timestamp NOT NULL,
    loan_limit_status varchar check (loan_limit_status in ('inactive', 'suggested', 'approved', 'rejected')) NOT null DEFAULT 'inactive',
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

INSERT INTO roles (role_id, role_name) VALUES
  (1, 'user'),
  (2, 'admin'),
  (3, 'checker'),
  (4, 'maker');


-- Seeding Risk

INSERT INTO risk (risk_id, score, description)
VALUES (1, 5, 'Sangat Buruk');
INSERT INTO risk (risk_id, score, description)
VALUES (2, 4, 'Buruk');
INSERT INTO risk (risk_id, score, description)
VALUES (3, 3, 'Sedang');
INSERT INTO risk (risk_id, score, description)
VALUES (4, 2, 'Baik');
INSERT INTO risk (risk_id, score, description)
VALUES (5, 1, 'Sangat Baik');

-- Seeding User
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (email, user_password, last_sign_in, created_at, role_id)
SELECT
    'user' || id || '@gmail.com',
    crypt('password' || id, gen_salt('bf', 12)),
    NOW(),
    NOW(),
    1 -- Assign a default role_id
FROM generate_series(1, 10) AS id;

-- Seeding Balance
INSERT INTO users_balance (user_id, balance, created_at, modified_at)
SELECT
    user_id,
    0.00,
    NOW(),
    NOW()
FROM generate_series(1, 10) AS user_id;

-- Seeding Loan Limit

INSERT INTO loan_limit (
    user_id,
    loan_limit_status,
    modified_at,
    limit_amount,
    created_at,
    available_amount
)
SELECT
    id AS user_id,
    'active' AS loan_limit_status,
    NOW() AS modified_at,
    50000000 + (id % 10) * 5000000 AS limit_amount, -- Limit dari 50jt hingga 100jt
    NOW() AS created_at,
    50000000 + (id % 10) * 5000000 - (id % 5) * 1000000 AS available_amount -- Sisa limit, mirip real case
FROM generate_series(1, 10) AS id;

-- Seeding Loan
-- Then, insert the generated data into the table
WITH generated_data AS (
    SELECT
        gs AS user_id,
        (random() * (1000000000 - 100000000) + 100000000)::float8 AS principle,
        floor(random() * 12 + 1)::int AS term,
        NOW() AS created_at,
        NOW() AS modified_at,
        (ARRAY['approved', 'rejected', 'waiting approval'])[floor(random() * 3) + 1] AS loan_status
    FROM generate_series(1, 10) gs
)
INSERT INTO loan (
    user_id,
    principle,
    interest,
    term,
    created_at,
    modified_at,
    loan_status,
    repayment_plan
)
SELECT
    gd.user_id,
    gd.principle,
    gd.principle * 0.05 AS interest,
    gd.term,
    gd.created_at,
    gd.modified_at,
    gd.loan_status,
    jsonb_agg(
        jsonb_build_object(
            'term', i.term,
            'principle', gd.principle,
            'interest', gd.principle * 0.05,
            'outstanding_amount', (gd.principle + (gd.principle * 0.05))
        )
        ORDER BY i.term
    ) AS repayment_plan
FROM generated_data gd
JOIN generate_series(1, 3) i(term) ON true
GROUP BY gd.user_id, gd.principle, gd.term, gd.created_at, gd.modified_at, gd.loan_status;

-- Seeding Installment (10 per 1 loan)

INSERT INTO installment (
    loan_id,
    term,
    principle,
    interest,
    fee,
    outstanding_amount,
    created_at,
    modified_at,
    due_date
)
SELECT
    l.loan_id,
    (elem->>'term')::int AS term,
    (elem->>'principle')::float8 AS principle,
    (elem->>'interest')::float8 AS interest,
    COALESCE((elem->>'fee')::float8, 0) AS fee,
    (elem->>'outstanding_amount')::float8 AS outstanding_amount,
    NOW() AS created_at,
    NOW() AS modified_at,
    CURRENT_DATE + ((elem->>'term')::int - 1) * interval '1 month' AS due_date
FROM loan l
JOIN LATERAL jsonb_array_elements(l.repayment_plan) AS elem ON TRUE;

-- Seeding Repayment

WITH repayment_data AS (
    SELECT
        repayment.user_id,
        repayment.installment_id,
        repayment.loan_id,
        (random() * (100000000 - 100000) + 100000)::numeric AS amount
    FROM (
        SELECT
            l.user_id,
            i.installment_id,
            i.loan_id
        FROM installment AS i
        JOIN loan AS l ON i.loan_id = l.loan_id
        WHERE l.user_id BETWEEN 5 AND 104
    ) AS repayment
    WHERE random() < 0.8  -- Hanya 80% dari installment yang punya repayment
)
INSERT INTO repayment (
    user_id,
    installment_id,
    loan_id,
    amount,
    returned_amount,
    created_at,
    modified_at
)
SELECT
    user_id,
    installment_id,
    loan_id,
    amount,
    CASE
        WHEN random() < 0.5 THEN (random() * amount * 0.9)::numeric
        ELSE NULL
    END AS returned_amount,
    NOW(),
    NOW()
FROM repayment_data;

INSERT INTO users (role_id, email, user_password, last_sign_in, created_at)
VALUES
(2, 'admin@example.com', '$2a$12$6YhIVpAAWWZ.8cP35f7OTecWlVm4t45a/1qJrGk0NRgOQxK/gi9mi', NOW(), NOW()),
(3, 'manager@example.com', '$2a$12$WWkhzOd0n82qUkCLxlDC..4MVxQgh6wprx85advA7Rn7E2VAakYEe', NOW(), NOW());
