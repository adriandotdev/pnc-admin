const MerchantService = require("../services/MerchantService");
const axios = require("axios");
const { HttpBadRequest } = require("../utils/HttpError");
jest.mock("mysql2", () => {
	const mConnection = {
		release: jest.fn(),
	};
	const mPool = {
		getConnection: jest.fn((callback) => callback(null, mConnection)),
		on: jest.fn(),
	};
	return {
		createPool: jest.fn(() => mPool),
	};
});

jest.mock("axios");

const mockRepository = {
	RegisterCompanyPartnerDetails: jest.fn().mockResolvedValue({ insertId: 1 }),
	AuditTrail: jest.fn().mockResolvedValue(undefined),
	GetCompanyPartnerDetails: jest.fn().mockResolvedValue([{ party_id: "123" }]),
};

describe("Register Company Partner Details", () => {
	/**
	 * @type {MerchantService}
	 */
	let merchantService;

	beforeEach(() => {
		merchantService = new MerchantService(mockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should register company detail", async () => {
		const GeneratePartyID = jest.spyOn(
			MerchantService.prototype,
			"GeneratePartyID"
		);

		GeneratePartyID.mockResolvedValue("ABC");

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
					},
				],
			},
		});

		const testData = {
			company_name: "ABC",
			address: "Laguna",
			id: 1,
		};

		const result = await merchantService.RegisterCompanyPartnerDetails(
			testData.company_name,
			testData.address,
			testData.id
		);

		expect(result).toEqual({ party_id: "ABC", message: "SUCCESS" });
		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
		expect(mockRepository.RegisterCompanyPartnerDetails).toHaveBeenCalledTimes(
			1
		);
		expect(merchantService.GeneratePartyID).toHaveBeenCalledTimes(1);
		expect(mockRepository.AuditTrail).toHaveBeenCalledWith({
			admin_id: testData.id,
			cpo_id: null,
			action: "CREATED Company Partner Details",
			remarks: "success",
		});
		expect(mockRepository.GetCompanyPartnerDetails).toHaveBeenCalledTimes(0);
	});

	it("should return BAD REQUEST when LOCATION NOT FOUND", async () => {
		axios.get.mockResolvedValue({ data: { results: [] } });

		try {
			const testData = {
				company_name: "ABC",
				address: "Laguna",
				id: 1,
			};

			await merchantService.RegisterCompanyPartnerDetails(
				testData.company_name,
				testData.address,
				testData.id
			);
		} catch (err) {
			expect(err).toBeInstanceOf(HttpBadRequest);
			expect(err.message).toBe("LOCATION_NOT_FOUND");
		}
	});

	it("should only call AuditTrail when result insertID is not set", async () => {
		mockRepository.RegisterCompanyPartnerDetails = jest
			.fn()
			.mockResolvedValue({ insertId: 0 });

		const testData = {
			company_name: "ABC",
			address: "Cabuyao, Laguna",
			id: 1,
		};

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
					},
				],
			},
		});

		await merchantService.RegisterCompanyPartnerDetails(
			testData.company_name,
			testData.address,
			testData.id
		);

		expect(mockRepository.AuditTrail).toHaveBeenCalledTimes(1);
	});
});
