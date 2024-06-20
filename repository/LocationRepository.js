const mysql = require("../database/mysql");

module.exports = class LocationRepository {
	CountLocations() {
		const QUERY = `
			SELECT 
				COUNT(*) AS total_locations
			FROM
				cpo_locations
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves a list of locations.
	 *
	 * @function GetLocations
	 * @param {number} limit - The maximum number of locations to retrieve.
	 * @param {number} offset - The number of locations to skip before starting to return data.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database query, containing the list of locations.
	 */
	GetLocations({ limit, offset }) {
		const QUERY = `
			SELECT 
				* 
			FROM 
				cpo_locations 
			LIMIT ? OFFSET ?
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [limit, offset], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves a list of unbound locations.
	 *
	 * @function GetUnbindedLocations
	 * @returns {Promise<Object>} A promise that resolves to the result of the database query, containing the list of unbound locations.
	 */
	GetUnbindedLocations() {
		const QUERY = `
			SELECT 
				* 
			FROM 
				cpo_locations 
			WHERE cpo_owner_id IS NULL`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Registers a new location.
	 *
	 * @function RegisterLocation
	 * @param {Object} locationData - An object containing location data.
	 * @param {string} locationData.cpo_owner_id - The ID of the Charging Point Operator (CPO) owning the location.
	 * @param {string} locationData.name - The name of the location.
	 * @param {string} locationData.address - The address of the location.
	 * @param {number} locationData.lat - The latitude coordinate of the location.
	 * @param {number} locationData.lng - The longitude coordinate of the location.
	 * @param {string} locationData.city - The city of the location.
	 * @param {string} locationData.region - The region or state of the location.
	 * @param {string} locationData.postal_code - The postal code of the location.
	 * @param {string[]} locationData.images - An array of image URLs associated with the location.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database insert operation, representing the registered location.
	 */
	RegisterLocation({
		cpo_owner_id,
		name,
		address,
		lat,
		lng,
		city,
		region,
		postal_code,
		images,
	}) {
		const QUERY = `
			INSERT INTO 
				cpo_locations 
					(cpo_owner_id, name, address, address_lat, address_lng, city, region, postal_code, images, date_created, date_modified)
			VALUES 
					(?,?,?,?,?,?,?,?,?, NOW(), NOW());
		`;

		return new Promise((resolve, reject) => {
			mysql.query(
				QUERY,
				[
					cpo_owner_id,
					name,
					address,
					lat,
					lng,
					city,
					region,
					postal_code,
					images,
				],
				(err, result) => {
					if (err) {
						reject(err);
					}

					resolve(result);
				}
			);
		});
	}

	/**
	 * Retrieves a list of locations bound to a specific Charging Point Operator (CPO) or unbound locations.
	 *
	 * @function GetBindedLocations
	 * @param {string} cpoOwnerID - The ID of the Charging Point Operator (CPO) to retrieve bound locations for.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database query, containing the list of bound locations or unbound locations if no specific CPO ID is provided.
	 */
	GetBindedLocations(cpoOwnerID) {
		const QUERY = `
			SELECT 
				* 
			FROM 
				cpo_locations 
			WHERE 
				cpo_owner_id =  ?
				OR cpo_owner_id IS NULL
			ORDER BY cpo_owner_id IS NULL
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [cpoOwnerID], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Binds a location to a Charging Point Operator (CPO).
	 *
	 * @function BindLocation
	 * @param {string} cpoOwnerID - The ID of the Charging Point Operator (CPO) to bind the location to.
	 * @param {string} locationID - The ID of the location to bind.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database procedure call, representing the binding operation.
	 */
	BindLocation(cpoOwnerID, locationID) {
		const QUERY = `CALL WEB_ADMIN_BIND_LOCATION(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [cpoOwnerID, locationID], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Unbinds a location from a Charging Point Operator (CPO).
	 *
	 * @function UnbindLocation
	 * @param {string} cpoOwnerID - The ID of the Charging Point Operator (CPO) from which to unbind the location.
	 * @param {string} locationID - The ID of the location to unbind.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database procedure call, representing the unbinding operation.
	 */
	UnbindLocation(cpoOwnerID, locationID) {
		const QUERY = `CALL WEB_ADMIN_UNBIND_LOCATION(?,?)`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [cpoOwnerID, locationID], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves a list of default facilities.
	 *
	 * @function GetDefaultFacilities
	 * @returns {Promise<Object>} A promise that resolves to the result of the database query, containing the list of default facilities.
	 */
	GetDefaultFacilities() {
		const QUERY = `SELECT * FROM facilities`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Adds facilities to a location.
	 *
	 * @function AddLocationFacilities
	 * @param {Array<Array>} facilities - An array of arrays, where each inner array contains a facility ID and a location ID to be associated.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database insert operation, representing the addition of facilities to the location.
	 */
	AddLocationFacilities(facilities) {
		const QUERY = `
			INSERT INTO 
				cpo_location_facilities 
				(facility_id, cpo_location_id)
			VALUES ?
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [facilities], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves a list of default parking types.
	 *
	 * @function GetDefaultParkingTypes
	 * @returns {Promise<Object>} A promise that resolves to the result of the database query, containing the list of default parking types.
	 */
	GetDefaultParkingTypes() {
		const QUERY = `
			SELECT 
				* 
			FROM 
				parking_types
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Adds parking types to a location with optional tags.
	 *
	 * @function AddLocationParkingTypes
	 * @param {Array<Array>} parkingTypes - An array of arrays, where each inner array contains a parking type ID, location ID, and optional tag.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database insert operation, representing the addition of parking types to the location.
	 */
	AddLocationParkingTypes(parkingTypes) {
		const QUERY = `
			INSERT INTO 
				cpo_location_parking_types (parking_type_id, cpo_location_id, tag)
			VALUES ?
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [parkingTypes], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Retrieves a list of default parking restrictions.
	 *
	 * @function GetDefaultParkingRestrictions
	 * @returns {Promise<Object>} A promise that resolves to the result of the database query, containing the list of default parking restrictions.
	 */
	GetDefaultParkingRestrictions() {
		const QUERY = `
			SELECT 
				* 
			FROM 
				parking_restrictions`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, (err, result) => {
				if (err) {
					reject(err);
				}
				resolve(result);
			});
		});
	}

	/**
	 * Adds parking restrictions to a location.
	 *
	 * @function AddLocationParkingRestrictions
	 * @param {Array<Array>} parkingRestrictions - An array of arrays, where each inner array contains a parking restriction code ID and a location ID to be associated.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database insert operation, representing the addition of parking restrictions to the location.
	 */
	AddLocationParkingRestrictions(parkingRestrictions) {
		const QUERY = `
			INSERT INTO 
				cpo_location_parking_restrictions (parking_restriction_code_id, cpo_location_id)
			VALUES ?
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [parkingRestrictions], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Searches for locations by name.
	 *
	 * @function SearchLocationByName
	 * @param {string} name - The name or a part of the name to search for.
	 * @param {number} limit - The maximum number of results to return.
	 * @param {number} offset - The number of results to skip.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database query, containing the locations matching the provided name, limited by the specified limit and offset.
	 */
	SearchLocationByName(name, limit, offset) {
		const QUERY = `
			SELECT 
				* 
			FROM 
				cpo_locations 
			WHERE 
				LOWER(name) LIKE ?
			LIMIT ${limit} OFFSET ${offset}
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [`%${name}%`], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}

	/**
	 * Records an audit trail entry.
	 *
	 * @function AuditTrail
	 * @param {string} admin_id - The ID of the administrator who performed the action.
	 * @param {string} cpo_id - The ID of the charging point operator associated with the action (can be null).
	 * @param {string} action - The description of the action performed.
	 * @param {string} remarks - Additional remarks or details about the action.
	 * @returns {Promise<Object>} A promise that resolves to the result of the database insert operation, representing the recording of the audit trail entry.
	 */
	AuditTrail({ admin_id, cpo_id, action, remarks }) {
		const QUERY = `
			INSERT INTO 
				admin_audit_trails (admin_id, cpo_id, action, remarks, date_created, date_modified)
			VALUES (
				?,?,?,?,NOW(),NOW()
			)
		`;

		return new Promise((resolve, reject) => {
			mysql.query(QUERY, [admin_id, cpo_id, action, remarks], (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	}
};
