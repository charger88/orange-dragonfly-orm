CREATE TABLE brand (
	id INT auto_increment PRIMARY KEY,
	brand_name VARCHAR(32) NOT NULL
);

CREATE TABLE car_model (
	id INT auto_increment PRIMARY KEY,
	brand_id INT NOT NULL,
	model_name VARCHAR(32) NOT NULL
);

CREATE TABLE car_model_color (
	id INT auto_increment PRIMARY KEY,
	car_model_id INT NOT NULL,
	color_id INT NOT NULL
);

CREATE TABLE color (
	id INT auto_increment PRIMARY KEY,
	color_name VARCHAR(8) NOT NULL
);

INSERT INTO brand (id, brand_name) VALUES (1, 'Chevrolet');
INSERT INTO brand (id, brand_name) VALUES (2, 'Ford');
INSERT INTO brand (id, brand_name) VALUES (3, 'Dodge');

INSERT INTO car_model (id, brand_id, model_name) VALUES (1, 1, 'Fusion');
INSERT INTO car_model (id, brand_id, model_name) VALUES (2, 1, 'Explorer');
INSERT INTO car_model (id, brand_id, model_name) VALUES (3, 2, 'Camaro');
INSERT INTO car_model (id, brand_id, model_name) VALUES (4, 2, 'Malibu');
INSERT INTO car_model (id, brand_id, model_name) VALUES (5, 3, 'Charger');
INSERT INTO car_model (id, brand_id, model_name) VALUES (6, 3, 'Challenger');

INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (1, 1, 1);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (2, 1, 2);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (3, 1, 3);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (4, 1, 4);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (5, 2, 1);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (6, 2, 2);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (7, 3, 3);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (8, 3, 4);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (9, 3, 1);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (10, 4, 2);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (11, 4, 3);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (12, 5, 4);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (13, 6, 1);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (14, 6, 2);
INSERT INTO car_model_color (id, car_model_id, color_id) VALUES (15, 6, 3);

INSERT INTO color (id, color_name) VALUES (1, 'red');
INSERT INTO color (id, color_name) VALUES (2, 'white');
INSERT INTO color (id, color_name) VALUES (3, 'blue');
INSERT INTO color (id, color_name) VALUES (4, 'black');