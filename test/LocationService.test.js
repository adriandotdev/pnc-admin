const LocationService = require("../services/LocationService");
const {
	HttpBadRequest,
	HttpInternalServerError,
} = require("../utils/HttpError");
const axios = require("axios");

jest.mock("mysql2", () => {
	const mConnection = {
		release: jest.fn(),
		commit: jest.fn(),
		rollback: jest.fn(),
		query: jest.fn(),
	};

	const mPool = {
		getConnection: jest.fn((callback) => callback(null, mConnection)),
		on: jest.fn(),
	};
	return {
		createPool: jest.fn(() => mPool),
	};
});

const mockRepository = {
	CountLocations: jest.fn(),
	GetLocations: jest.fn(),
	GetUnbindedLocations: jest.fn(),
	RegisterLocation: jest.fn(),
	AddLocationFacilities: jest.fn(),
	AddLocationParkingTypes: jest.fn(),
	AddLocationParkingRestrictions: jest.fn(),
	AuditTrail: jest.fn(),
};

jest.mock("axios");

describe("Location Service - Unit Tests", () => {
	/**
	 * @type {LocationService}
	 */
	let service;

	beforeEach(() => {
		service = new LocationService(mockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should successfully retrieve locations - GetLocations", async () => {
		mockRepository.CountLocations.mockResolvedValue([{ total_locations: 1 }]);
		mockRepository.GetLocations.mockResolvedValue([
			{ id: 1, name: "Test Location" },
		]);

		const result = await service.GetLocations({ limit: 10, offset: 0 });

		expect(result).toEqual({
			locations: [{ id: 1, name: "Test Location" }],
			total_returned_locations: 1,
			total_locations: 1,
			limit: 10,
			offset: 0,
		});
		expect(mockRepository.CountLocations).toHaveBeenCalledTimes(1);
		expect(mockRepository.GetLocations).toHaveBeenCalledTimes(1);
	});

	it("should throw BAD REQUEST when limit is not in number type - GetLocations", async () => {
		try {
			await service.GetLocations({ limit: "asdf", offset: 0 });
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe(
				"Invalid limit. Limit must be in type of number"
			);
			expect(mockRepository.CountLocations).not.toHaveBeenCalled();
			expect(mockRepository.GetLocations).not.toHaveBeenCalled();
		}
	});

	it("should throw BAD REQUEST when offset is not in number type - GetLocations", async () => {
		try {
			await service.GetLocations({ limit: 10, offset: "1234" });
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe(
				"Invalid offset. Offset must be in type of number"
			);
			expect(mockRepository.CountLocations).not.toHaveBeenCalled();
			expect(mockRepository.GetLocations).not.toHaveBeenCalled();
		}
	});

	it("should retrieve list of unbinded locations", async () => {
		mockRepository.GetUnbindedLocations.mockResolvedValue([
			{ id: 1, name: "Test Location" },
		]);

		const result = await service.GetUnbindedLocations();

		expect(result).toEqual([{ id: 1, name: "Test Location" }]);
		expect(mockRepository.GetUnbindedLocations).toHaveBeenCalledTimes(1);
	});

	it("should successfully register a location - RegisterLocation", async () => {
		mockRepository.RegisterLocation.mockResolvedValue({ insertId: 1 });
		mockRepository.AddLocationFacilities.mockResolvedValue(null);
		mockRepository.AddLocationParkingTypes.mockResolvedValue(null);
		mockRepository.AddLocationParkingRestrictions.mockResolvedValue({
			affectedRows: 1,
		});

		axios.get.mockResolvedValue({
			data: {
				results: [
					{
						address_components: [
							{
								long_name: "Cabuyao",
								short_name: "Cabuyao",
								types: ["locality", "political"],
							},
							{
								long_name: "Laguna",
								short_name: "Laguna",
								types: ["administrative_area_level_2", "political"],
							},
							{
								long_name: "Calabarzon",
								short_name: "Calabarzon",
								types: ["administrative_area_level_1", "political"],
							},
							{
								long_name: "Philippines",
								short_name: "PH",
								types: ["country", "political"],
							},
						],
						geometry: {
							location: { lat: 14.06028, lng: 120.99423 },
						},
					},
				],
			},
		});

		const result = await service.RegisterLocation({
			cpo_owner_id: 1,
			name: "Test Location",
			address: "123 Test Street",
			facilities: ["Parking", "Restroom"],
			parking_types: ["Motorcycle", "Car"],
			parking_restrictions: ["No Pets"],
			images: ["image1.jpg", "image2.jpg"],
			admin_id: 1,
		});

		expect(result).toBe("SUCCESS");
		expect(mockRepository.RegisterLocation).toHaveBeenCalledTimes(1);
		expect(mockRepository.AddLocationFacilities).toHaveBeenCalledTimes(1);
		expect(mockRepository.AddLocationParkingTypes).toHaveBeenCalledTimes(1);
		expect(mockRepository.AddLocationParkingRestrictions).toHaveBeenCalledTimes(
			1
		);
		expect(axios.get).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
	});

	it("should throw BAD REQUEST when address components is undefined or empty - RegisterLocation", async () => {
		axios.get.mockResolvedValue({
			data: {
				results: [{}],
			},
		});
		try {
			await service.RegisterLocation({
				cpo_owner_id: 1,
				name: "Test Location",
				address: "123 Test Street",
				facilities: ["Parking", "Restroom"],
				parking_types: ["Motorcycle", "Car"],
				parking_restrictions: ["No Pets"],
				images: ["image1.jpg", "image2.jpg"],
				admin_id: 1,
			});
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe("LOCATION_NOT_FOUND");
			expect(mockRepository.RegisterLocation).not.toHaveBeenCalled();
			expect(mockRepository.AddLocationFacilities).not.toHaveBeenCalled();
			expect(mockRepository.AddLocationParkingTypes).not.toHaveBeenCalled();
			expect(
				mockRepository.AddLocationParkingRestrictions
			).not.toHaveBeenCalled();
			expect(axios.get).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: 1,
				cpo_id: null,
				action: "ATTEMPT to ADD new location",
				remarks: "failed",
			});
		}
	});

	it("should successfully run the method but not register the location", async () => {
		mockRepository.RegisterLocation.mockResolvedValue({ insertId: 1 });
		mockRepository.AddLocationFacilities.mockResolvedValue(null);
		mockRepository.AddLocationParkingTypes.mockResolvedValue(null);
		mockRepository.AddLocationParkingRestrictions.mockResolvedValue({
			affectedRows: 0,
		});

		axios.get.mockResolvedValue({
			data: {
				results: [
					{
						address_components: [
							{
								long_name: "Cabuyao",
								short_name: "Cabuyao",
								types: ["locality", "political"],
							},
							{
								long_name: "Laguna",
								short_name: "Laguna",
								types: ["administrative_area_level_2", "political"],
							},
							{
								long_name: "Calabarzon",
								short_name: "Calabarzon",
								types: ["administrative_area_level_1", "political"],
							},
							{
								long_name: "Philippines",
								short_name: "PH",
								types: ["country", "political"],
							},
						],
						geometry: {
							location: { lat: 14.06028, lng: 120.99423 },
						},
					},
				],
			},
		});

		const result = await service.RegisterLocation({
			cpo_owner_id: 1,
			name: "Test Location",
			address: "123 Test Street",
			facilities: ["Parking", "Restroom"],
			parking_types: ["Motorcycle", "Car"],
			parking_restrictions: ["No Pets"],
			images: ["image1.jpg", "image2.jpg"],
			admin_id: 1,
		});

		expect(result).toEqual({ insertId: 1 });
		expect(mockRepository.RegisterLocation).toHaveBeenCalledTimes(1);
		expect(mockRepository.AddLocationFacilities).toHaveBeenCalledTimes(1);
		expect(mockRepository.AddLocationParkingTypes).toHaveBeenCalledTimes(1);
		expect(mockRepository.AddLocationParkingRestrictions).toHaveBeenCalledTimes(
			1
		);
		expect(axios.get).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: 1,
			cpo_id: null,
			action: "ATTEMPT to ADD new location",
			remarks: "failed",
		});
	});

	it("should throw an error when try-catch in register location fails", async () => {
		mockRepository.RegisterLocation.mockRejectedValue(
			new HttpInternalServerError("Internal Server Error", [])
		);

		try {
			await service.RegisterLocation({
				cpo_owner_id: 1,
				name: "Test Location",
				address: "123 Test Street",
				facilities: ["Parking", "Restroom"],
				parking_types: ["Motorcycle", "Car"],
				parking_restrictions: ["No Pets"],
				images: ["image1.jpg", "image2.jpg"],
				admin_id: 1,
			});
		} catch (err) {
			expect(err).toBeInstanceOf(HttpInternalServerError);
			expect(err.message).toBe("Internal Server Error");
			expect(mockRepository.RegisterLocation).toHaveBeenCalledTimes(1);
			expect(mockRepository.AddLocationFacilities).not.toHaveBeenCalled();
			expect(mockRepository.AddLocationParkingTypes).not.toHaveBeenCalled();
			expect(
				mockRepository.AddLocationParkingRestrictions
			).not.toHaveBeenCalled();
			expect(axios.get).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
			expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
				admin_id: 1,
				cpo_id: null,
				action: "ATTEMPT to ADD new location",
				remarks: "failed",
			});
		}
	});
});
