'use strict';

const app = require('express')();
const mysql = require('mysql');
const flatten = require('flat');
let Stack = require('stackjs');
let stack = new Stack();

const bodyParser = require('body-parser');
const _ = require('lodash');

app.use(bodyParser.json({
	limit: '8mb'
}));

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const db = mysql.createConnection({
	host: process.env.MYSQL_HOST || '172.17.0.2',
	user: process.env.MYSQL_USER || 'root',
	password: process.env.MYSQL_PASSWORD || 'pipedrive',
	database: process.env.MYSQL_DATABASE || 'pipedrive'
});

db.connect((err) => {
	if (err) {
		console.error('Error connecting mysql: ', err);
	} else {
		console.log('Mysql connection successful');
		app.listen(PORT, HOST, (err) => {
			if (err) {
				console.error('Error starting  server', err);
			} else { 
				console.log('Server listening at port ' + PORT);
			}
		});
	}
});

app.post('/', (req, res) => {
	let response = '';
	let reqBody = flatten(req.body);
	let recvOrgNames = Object.values(reqBody);
	// to get unique organization names
	recvOrgNames = recvOrgNames.filter((x, i, a) => a.indexOf(x) == i);
	let jsonObj = JSON.parse(JSON.stringify(req.body));
	let result;
	getAllOrganizationNames((err, data) => {
		if (err) { 
			response = err;
		}
		else {
			let existingOrgNames = [];
			data.forEach(function(org) {
				existingOrgNames.push(org.name);
			});
			insertOrganizations(existingOrgNames, recvOrgNames, (err, newOrgNames) => {
				if (err) {
					console.log("Error: ", err);
				} else {
					console.log("These have been inserted: ", newOrgNames);
					insertOrgRelationsWrapper(reqBody, (err, insertedOrgs) => {
						if (err) {
							console.log('Error');
							res.json({
								success: false,
								message: 'Failure'
							});
						} else {
							console.log('Success');
							response = 'success';
							res.json({
								success: true,
								message: response
							});
						}
					});
				}
			});
		}
	});
});

app.get('/', (req, res) => {
	let org_name = req.body['org_name'];
	const PAGE_LENGTH = 100;
	const page = parseInt(req.query['page']);
	if (isNaN(page) || page < 1) {
		res.status(400).json({
			success: false,
			response: 'Failed'
		});
	}
	try {
		getOrgByName(org_name, (getOrgErr, org) => {
		if (getOrgErr) {
			console.log('Error');
			console.log(getOrgErr);
		} else {
			console.log('Success');
			getAllOrgRelationships(function(getOrgRelErr, orgRelations) {
				if (getOrgRelErr) {
					console.log('Error');
					console.log(getOrgRelErr);
				} else {
					console.log('Success');
					let target = org[0];
					let parentIds = [];
					let daughterIds = [];
					let sisterIds = [];

					for (let key in orgRelations) {
						if (orgRelations[key].parent_id === orgRelations[key].child_id) continue;

						if (target.id === orgRelations[key].child_id) {
							parentIds.push(orgRelations[key].parent_id);
						} else if (target.id === orgRelations[key].parent_id) {
							daughterIds.push(orgRelations[key].child_id);
						}
					}

					for (let key in orgRelations) {
						if (parentIds.includes(orgRelations[key].parent_id)) {
							sisterIds.push(orgRelations[key].child_id);
						}
					}

					let rel_ids = parentIds.concat(sisterIds).concat(daughterIds);
					rel_ids = [... new Set(rel_ids)].join(',');
					let off = ((page - 1) * PAGE_LENGTH);

					getOrgsByRelations(rel_ids, off, PAGE_LENGTH, 
						(e, organizations) => {
						if (e) {
							console.log('Error');
							console.log(e);
						} else {
							let response = [];
							for (let key in organizations) {
								if (organizations[key].name.toLowerCase() === org_name.toLowerCase()) continue;

								if (parentIds.includes(organizations[key].id)) {
									response.push({
										"relationship_type": "parent",
										"org_name": organizations[key].name
									});
								} else if (daughterIds.includes(organizations[key].id)) {
									response.push({
										"relationship_type": "daughter",
										"org_name": organizations[key].name
									});
								} else if (sisterIds.includes(organizations[key].id)) {
									response.push({
										"relationship_type": "sister",
										"org_name": organizations[key].name
									});
								}
							}
							response.sort(compare);

							res.json({
								response: response
							});
						}
					});
				}
			});
		}
	});
	} catch (err) {
		throw new Error(err);
		res.json({
			response: 'error'
		});
	}
});

const getOrgsByRelations = (ids, offset, pageLength, callback) => {
	db.query(`SELECT * FROM organizations WHERE id in (${ids}) LIMIT ${pageLength} OFFSET ${offset}`, 
		(err, result, fields) => {
		if (err) {
			callback(err, null);
		}
		else {
			callback(null, JSON.parse(JSON.stringify(result)));
		}
	});	
}

const insertOrgRelationsWrapper = (reqBody, callback) => {
	getAllOrganizationNames((err, orgNames) => {
		if (err) {
			console.log('Some error occurred');
			callback(err, null);
		} else {
			let childToParent = { };
			initParentChildren(childToParent, reqBody, orgNames);
			getAllOrgRelationships((err, orgRelations) => {
				if (err) {
					console.log('Some error occurred');
					callback(err, null);
				} else {
					console.log('Success');
					insertOrgRelationships(orgRelations, childToParent, (err, insertedOrgRels) => {
						if (err) {
							console.log('Error');
							callback(err, null);
						} else {
							console.log('Success');
							callback(null, insertedOrgRels);
						}
					});
				}
			});
		}
	});
}

const insertOrgRelationships = (existingOrgRels, recvOrgRels, callback) => {
	let newOrgRels = "";
	let childIds = Object.keys(recvOrgRels);
	let first = true;
	if (Object.keys(existingOrgRels).length === 0) {
		for (let childId in recvOrgRels) {
			recvOrgRels[childId].forEach(function(parentId) {
				if (first) {
					newOrgRels += "(" + parentId + ", " + childId + ")";
					first = false;
				} else {
					newOrgRels += ", (" + parentId + ", " + childId + ")";
				}
			})
		}
	} else {
		for (let key in existingOrgRels) {
			let childId = existingOrgRels[key].child_id;
			let parentId = existingOrgRels[key].parent_id;
			if (childIds.includes(childId) 
				&& recvOrgRels[childId] !== undefined 
				&& recvOrgRels[childId].includes(parentId)
				) {
				continue;
			}
			if (first) {
				newOrgRels += "(" + parentId + ", " + childId + ")";
				first = false;
			} else {
				newOrgRels += ", (" + parentId + ", " + childId + ")";
			}
		}	
	}
	if (newOrgRels === "" || newOrgRels.length == 0) {
		console.log("All the rows are already there");
		return;
	} else {
		console.log('Org relas', newOrgRels);
		db.query("INSERT INTO org_relationships(parent_id, child_id) VALUES " + newOrgRels, (err, result, fields) => {
			if (err) {
				console.log("Error when inserting in org_relationships", err);
				callback(err, null);
			}
			else {
				console.log("Success");
				callback(null, JSON.parse(JSON.stringify(result)));
			}
		});	
	}
}

const insertIntoChildParent = (childParent, childId, parentId) => {
	if (childParent[childId] === undefined) {
		childParent[childId] = [];
	}
	if (!childParent[childId].includes(parentId)) {
		childParent[childId].push(parentId);
	}
}

const initParentChildren = (childToParent, reqBody, orgNames) => {
	let currLength = 0;
	let parent;
	let parentId;
	let childId;
	for (let orgName in reqBody) {
		if (stack.isEmpty()) {
			parent = reqBody[orgName];
			parentId = getIdOfOrg(orgNames, parent);
			stack.push(parent);
		}
		let count = countSubString(orgName, 'daughters');
		if (count > currLength) {
			currLength += 1;
			parent = doPeek(stack);
			parentId = getIdOfOrg(orgNames, parent);
		} else if (count < currLength) {
			let counter = currLength - count;
			while (counter >= 0) {
				counter--;
				doPop(stack);
			}
			parent = doPeek(stack);
			parentId = getIdOfOrg(orgNames, parent);
			currLength -= count;
		} else {
			parent = doPop(stack);
			parentId = getIdOfOrg(orgNames, parent);
			if (!stack.isEmpty()) {
				parent = doPeek(stack);
				parentId = getIdOfOrg(orgNames, parent);
			}
		}
		childId = getIdOfOrg(orgNames, reqBody[orgName]);
		insertIntoChildParent(childToParent, childId, parentId);
		stack.push(reqBody[orgName]);
	}
}

const getIdOfOrg = (orgNames, orgName) => {
	if (orgName !== undefined) {
		for (let key in orgNames) {
			if (orgNames[key].name == orgName) {
				return orgNames[key].id;
			}
		}
	}
}

const countSubString = (str, subStr) => str.split(subStr).length - 1;

const getAllOrganizationNames = (callback) => {
	db.query("SELECT * FROM organizations ORDER BY name asc", (err, result, fields) => {
		if (err) {
			callback(err, null);
		}
		else {
			callback(null, JSON.parse(JSON.stringify(result)));
		}
	});
}

const getOrgByName = (org_name, callback) => {
	db.query(`SELECT * FROM organizations WHERE name = '${org_name}'`, (err, result, fields) => {
		if (err) {
			callback(err, null);
		}
		else {
			callback(null, JSON.parse(JSON.stringify(result)));
		}
	});
}

const getAllOrgRelationships = (callback) => {
	db.query("SELECT * FROM org_relationships", (err, result, fields) => {
		if (err) {
			callback(err, null);
		}
		else {
			callback(null, JSON.parse(JSON.stringify(result)));
		}
	});
}

const insertOrganizations = (existingOrgs, recvOrgs, callback) => {
	let arr = recvOrgs.filter(x => !existingOrgs.includes(x));
	let newOrgs = "";
	let first = true;
	arr.forEach(function(org) {
		if (first) {
			newOrgs += "('" + org + "')";
			first = false;
		}
		else {
			newOrgs += ", ('" + org + "')";
		}
	});

	if (newOrgs === "" || newOrgs.length == 0) {
		console.log("All the rows are already there");
		return;
	} else {
		db.query("INSERT INTO organizations(name) VALUES " + newOrgs, (err, result, fields) => {
			if (err) {
				console.log("Some error occurred");
				callback(err, null);
			}
			else {
				console.log("Success");
				callback(null, arr);
			}
		});	
	}
}

const doPop = (stack) => {
	if (!stack.isEmpty()) return stack.pop();
}

const doPeek = (stack) => {
	if (!stack.isEmpty()) return stack.peek();
}

function compare(a, b) {
  if (a.org_name < b.org_name){
    return -1;
  }
  if (a.org_name > b.org_name){
    return 1;
  }
  return 0;
}
