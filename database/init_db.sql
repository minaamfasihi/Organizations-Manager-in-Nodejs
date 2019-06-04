-- CREATE USER minfas@localhost identified by 'minfas@localhost';

-- CREATE DATABASE IF NOT EXISTS pipedrive;

-- GRANT all privileges on pipedrive.* to minfas@localhost;

-- ALTER USER 'minfas'@localhost IDENTIFIED WITH mysql_native_password BY 'pipedrive';

DROP DATABASE pipedrive;

CREATE DATABASE pipedrive;

USE pipedrive;

DROP TABLE IF EXISTS `organizations`;
DROP TABLE IF EXISTS `org_relationships`;

CREATE TABLE `organizations` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`name` varchar(255) NOT NULL UNIQUE,
	PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `org_relationships` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`parent_id` int(11) NOT NULL,
	`child_id` int(11) NOT NULL,
	PRIMARY KEY (`id`),
	FOREIGN KEY (`parent_id`) REFERENCES `organizations`(`id`),
	FOREIGN KEY (`child_id`) REFERENCES `organizations`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE INDEX `parent_index` ON `org_relationships` (`parent_id`);
CREATE INDEX `child_index` ON `org_relationships` (`child_id`);
