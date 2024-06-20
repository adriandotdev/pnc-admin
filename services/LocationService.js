const LocationRepository = require("../repository/LocationRepository");

const axios = require("axios");
const { HttpBadRequest } = require("../utils/HttpError");

const logger = require("../config/winston");

module.exports = class LocationService {
	#repository;

	constructor() {
		this.#repository = new LocationRepository();
	}

	/**
	 * Retrieves a list of locations with pagination support.
	 *
	 * @async
	 * @function GetLocations
	 * @param {object} options - An object containing limit and offset values for pagination.
	 * @param {number} options.limit - The maximum number of locations to retrieve.
	 * @param {number} options.offset - The number of locations to skip.
	 * @throws {HttpBadRequest} Throws an error if the provided limit or offset is not a number.
	 * @returns {Promise<Array>} A promise that resolves to an array containing the retrieved locations.
	 */
	async GetLocations({ limit, offset }) {
		if (typeof limit !== "number")
			throw new HttpBadRequest(
				"Invalid limit. Limit must be in type of number"
			);

		if (typeof offset !== "number")
			throw new HttpBadRequest(
				"Invalid offset. Limit must be in type of number"
			);

		const totalLocationsInDB = await this.#repository.CountLocations();
		const result = await this.#repository.GetLocations({ limit, offset });

		return {
			locations: result,
			total_returned_locations: result.length,
			total_locations: totalLocationsInDB[0].total_locations,
			limit,
			offset,
		};
	}

	/**
	 * Retrieves a list of locations that are not yet bound to any charging point operator.
	 *
	 * @async
	 * @function GetUnbindedLocations
	 * @returns {Promise<Array>} A promise that resolves to an array containing the unbinded locations.
	 */
	async GetUnbindedLocations() {
		const result = await this.#repository.GetUnbindedLocations();

		return result;
	}

	/**
	 * Registers a new location and performs necessary validations and actions.
	 *
	 * @async
	 * @function RegisterLocation
	 * @param {Object} data - An object containing location registration data.
	 * @param {string} data.cpo_owner_id - The ID of the charging point operator owning the location (optional).
	 * @param {string} data.name - The name of the location.
	 * @param {string} data.address - The address of the location.
	 * @param {string[]} data.facilities - An array of facility IDs associated with the location.
	 * @param {Object[]} data.parking_types - An array of parking type objects containing IDs and tags associated with the location.
	 * @param {string[]} data.parking_restrictions - An array of parking restriction codes associated with the location.
	 * @param {string[]} data.images - An array of image URLs representing the location.
	 * @param {string} data.admin_id - The ID of the administrator performing the registration.
	 * @throws {HttpBadRequest} Throws an error if the location is not found or if there are any issues during registration.
	 * @returns {Promise<string | Object>} A promise that resolves to "SUCCESS" if the registration is successful, or an error object if registration fails.
	 */
	async RegisterLocation({
		cpo_owner_id,
		name,
		address,
		facilities,
		parking_types,
		parking_restrictions,
		images,
		admin_id,
	}) {
		try {
			// Request to Google Geocoding API for the data based on the address provided.
			const geocodedAddress = await axios.get(
				`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURI(
					address
				)}&key=${process.env.GOOGLE_GEO_API_KEY}`
			);

			/**
			 * Get the address_components object
			 *
			 * This object contains all of the details related to a address such as municipality, region, and postal code.
			 */
			const address_components =
				geocodedAddress.data.results[0]?.address_components;

			// If location is not found.
			if (!address_components)
				throw new HttpBadRequest("LOCATION_NOT_FOUND", []);

			// Get the city name when the type is 'locality'
			const city = address_components.find((component) =>
				component.types.includes("locality")
			)?.long_name;

			/**
			 * Get the region name when the type is 'administrative_area_level_1'
			 *
			 * Get the first three letters of the region, convert it to uppercase, and trim it.
			 */
			const region = String(
				address_components.find((component) =>
					component.types.includes("administrative_area_level_1")
				)?.short_name
			)
				.slice(0, 3)
				.toUpperCase()
				.trim();

			/**
			 * Get the postal code of the address when the type is 'postal_code'
			 */
			const postal_code = address_components.find((component) =>
				component.types.includes("postal_code")
			)?.long_name;

			// Get the latitude, and longitude of the address
			const { lat, lng } = geocodedAddress.data.results[0].geometry.location;

			// Get the formatted address.
			const formatted_address =
				geocodedAddress.data.results[0].formatted_address;

			// Location Registration
			try {
				const result = await this.#repository.RegisterLocation({
					cpo_owner_id: cpo_owner_id || null,
					name,
					address: formatted_address,
					lat,
					lng,
					city,
					region,
					postal_code: postal_code || null,
					images: JSON.stringify(images),
				});

				const LOCATION_ID = result.insertId;

				// Add location's facilities
				const newFacilities = facilities.map((facility) => [
					facility,
					LOCATION_ID,
				]);

				await this.#repository.AddLocationFacilities(newFacilities);

				// Add location's parking types
				const newParkingTypes = parking_types.map((parkingType) => [
					parkingType,
					LOCATION_ID,
					[1, 3, 4, 5].includes(parkingType) ? "OUTDOOR" : "INDOOR",
				]);

				await this.#repository.AddLocationParkingTypes(newParkingTypes);

				// Add location's parking restrictions
				const newParkingRestrictions = parking_restrictions.map(
					(parking_restriction) => [parking_restriction, LOCATION_ID]
				);

				const parkingRestrictionsResult =
					await this.#repository.AddLocationParkingRestrictions(
						newParkingRestrictions
					);

				if (parkingRestrictionsResult.affectedRows >= 1) {
					await this.#repository.AuditTrail({
						admin_id,
						cpo_id: null,
						action: "ADD new location",
						remarks: "success",
					});

					return "SUCCESS";
				}

				await this.#repository.AuditTrail({
					admin_id,
					cpo_id: null,
					action: "ATTEMPT to ADD new location",
					remarks: "failed",
				});

				return result;
			} catch (err) {
				throw err;
			}
		} catch (err) {
			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: "ATTEMPT to ADD new location",
				remarks: "failed",
			});
			throw err;
		}
	}

	/**
	 * Retrieves a list of locations bound to a specific charging point operator or unbound locations.
	 *
	 * @async
	 * @function GetBindedLocations
	 * @param {string} cpoOwnerID - The ID of the charging point operator to filter locations, or null to retrieve unbound locations.
	 * @returns {Promise<Array>} A promise that resolves to an array containing the bound locations if a CPO owner ID is provided, or unbound locations if no ID is provided.
	 */
	async GetBindedLocations(cpoOwnerID) {
		const result = await this.#repository.GetBindedLocations(cpoOwnerID);

		return result;
	}

	/**
	 * Binds a location to a charging point operator (CPO).
	 *
	 * @async
	 * @function BindLocation
	 * @param {string} cpoOwnerID - The ID of the charging point operator to which the location will be bound.
	 * @param {string} locationID - The ID of the location to be bound.
	 * @param {string} admin_id - The ID of the admin performing the operation.
	 * @returns {Promise<string>} A promise that resolves to a status indicating the success or failure of the operation.
	 * @throws {HttpBadRequest} Throws an error if the operation fails.
	 */
	async BindLocation(cpoOwnerID, locationID, admin_id) {
		try {
			const result = await this.#repository.BindLocation(
				cpoOwnerID,
				locationID
			);

			const status = result[0][0].STATUS;

			if (status !== "SUCCESS") throw new HttpBadRequest(status, []);

			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: `BIND location to CPO with ID of ${cpoOwnerID}`,
				remarks: "success",
			});

			return status;
		} catch (err) {
			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: `ATTEMPT to BIND location to CPO with ID of ${cpoOwnerID}`,
				remarks: "failed",
			});
			throw err;
		}
	}

	/**
	 * Unbinds a location from a charging point operator (CPO).
	 *
	 * @async
	 * @function UnbindLocation
	 * @param {string} cpoOwnerID - The ID of the charging point operator from which the location will be unbound.
	 * @param {string} locationID - The ID of the location to be unbound.
	 * @param {string} admin_id - The ID of the admin performing the operation.
	 * @returns {Promise<string>} A promise that resolves to a status indicating the success or failure of the operation.
	 * @throws {HttpBadRequest} Throws an error if the operation fails.
	 */
	async UnbindLocation(cpoOwnerID, locationID, admin_id) {
		try {
			const result = await this.#repository.UnbindLocation(
				cpoOwnerID,
				locationID
			);

			const status = result[0][0].STATUS;

			if (status !== "SUCCESS") throw new HttpBadRequest(status, []);

			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: `UNBIND location from CPO with ID of ${cpoOwnerID}`,
				remarks: "success",
			});

			return status;
		} catch (err) {
			await this.#repository.AuditTrail({
				admin_id,
				cpo_id: null,
				action: `ATTEMPT to UNBIND location from CPO with ID of ${cpoOwnerID}`,
				remarks: "failed",
			});
			throw err;
		}
	}

	/**
	 * Retrieves default data related to locations, including facilities, parking types, and parking restrictions.
	 *
	 * @async
	 * @function GetDefaultData
	 * @returns {Promise<Object>} A promise that resolves to an object containing default data for locations.
	 * @throws {Error} Throws an error if the retrieval fails.
	 */
	async GetDefaultData() {
		const facilities = await this.#repository.GetDefaultFacilities();
		const parking_types = await this.#repository.GetDefaultParkingTypes();
		const parking_restrictions =
			await this.#repository.GetDefaultParkingRestrictions();

		return { facilities, parking_types, parking_restrictions };
	}

	/**
	 * Searches for locations by name, with optional pagination.
	 *
	 * @async
	 * @function SearchLocationByName
	 * @param {string} name - The name or part of the name to search for.
	 * @param {number} limit - The maximum number of results to return.
	 * @param {number} offset - The number of results to skip before returning.
	 * @returns {Promise<Array<Object>>} A promise that resolves to an array of location objects matching the search criteria.
	 * @throws {Error} Throws an error if the search fails.
	 */
	async SearchLocationByName(name, limit, offset) {
		const result = await this.#repository.SearchLocationByName(
			name,
			limit,
			offset
		);

		return result;
	}
};
