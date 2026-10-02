// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IECONEconomicObject {
    enum ObjectStatus { ACTIVE, IN_ESCROW, STRANDED, RECOVERED, EXPIRED, LIQUIDATED }

    function objects(bytes32 id) external view returns (
        bytes32 id_,
        address owner,
        uint8 objectType,
        uint256 value,
        uint256 expiry,
        bool transferable,
        ObjectStatus status,
        bytes32 metadataHash
    );

    function transferFrom(address from, address to, bytes32 id) external;
    function isApprovedOrOwner(address spender, bytes32 id) external view returns (bool);
}

/**
 * @title ECONMarketplace
 * @notice High-throughput decentralized marketplace for programmable economic objects on Monad.
 * Supports autonomous agent spot trades with 1.0% protocol fee.
 */
contract ECONMarketplace {
    struct Listing {
        bytes32 listingId;
        bytes32 objectId;
        address seller;
        uint256 price; // In MON wei
        bool active;
        uint256 listedAt;
    }

    IECONEconomicObject public immutable economicObjectContract;
    address public owner;
    address public feeRecipient;
    uint256 public constant FEE_BPS = 100; // 1.00% (100 / 10000)
    uint256 public constant BPS_DENOMINATOR = 10000;

    mapping(bytes32 => Listing) public listings;
    bytes32[] public allListingIds;

    event ObjectListed(
        bytes32 indexed listingId,
        bytes32 indexed objectId,
        address indexed seller,
        uint256 price,
        uint256 listedAt
    );
    event ListingCancelled(
        bytes32 indexed listingId,
        bytes32 indexed objectId,
        address indexed seller
    );
    event ObjectPurchased(
        bytes32 indexed listingId,
        bytes32 indexed objectId,
        address indexed buyer,
        address seller,
        uint256 price,
        uint256 fee
    );
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    modifier onlyOwner() {
        require(msg.sender == owner, "ECON: Only owner");
        _;
    }

    constructor(address _economicObjectContract, address _feeRecipient) {
        require(_economicObjectContract != address(0), "ECON: Invalid object contract");
        require(_feeRecipient != address(0), "ECON: Invalid fee recipient");
        economicObjectContract = IECONEconomicObject(_economicObjectContract);
        owner = msg.sender;
        feeRecipient = _feeRecipient;
    }

    function setFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "ECON: Invalid recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(oldRecipient, _newRecipient);
    }

    function listObject(bytes32 listingId, bytes32 objectId, uint256 price) external {
        require(listings[listingId].listingId == bytes32(0), "ECON: Listing already exists");
        require(price > 0, "ECON: Price must be greater than zero");

        (
            ,
            address objOwner,
            ,
            ,
            uint256 expiry,
            bool transferable,
            IECONEconomicObject.ObjectStatus status,
            
        ) = economicObjectContract.objects(objectId);

        require(objOwner == msg.sender, "ECON: Caller not object owner");
        require(transferable, "ECON: Object not transferable");
        require(status == IECONEconomicObject.ObjectStatus.ACTIVE, "ECON: Object not active");
        require(expiry == 0 || expiry > block.timestamp, "ECON: Object expired");
        require(
            economicObjectContract.isApprovedOrOwner(address(this), objectId),
            "ECON: Marketplace not approved to transfer object"
        );

        listings[listingId] = Listing({
            listingId: listingId,
            objectId: objectId,
            seller: msg.sender,
            price: price,
            active: true,
            listedAt: block.timestamp
        });

        allListingIds.push(listingId);

        emit ObjectListed(listingId, objectId, msg.sender, price, block.timestamp);
    }

    function cancelListing(bytes32 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "ECON: Listing not active");
        require(listing.seller == msg.sender || msg.sender == owner, "ECON: Unauthorized");

        listing.active = false;
        emit ListingCancelled(listingId, listing.objectId, listing.seller);
    }

    function buyObject(bytes32 listingId) external payable {
        Listing storage listing = listings[listingId];
        require(listing.active, "ECON: Listing not active");
        require(msg.value >= listing.price, "ECON: Insufficient payment");
        require(msg.sender != listing.seller, "ECON: Buyer cannot be seller");

        listing.active = false;
        bytes32 objId = listing.objectId;
        address seller = listing.seller;
        uint256 price = listing.price;

        uint256 fee = (price * FEE_BPS) / BPS_DENOMINATOR;
        uint256 sellerPayout = price - fee;

        // 1. Transfer object ownership from seller to buyer
        economicObjectContract.transferFrom(seller, msg.sender, objId);

        // 2. Transfer seller payout
        (bool sentSeller, ) = payable(seller).call{value: sellerPayout}("");
        require(sentSeller, "ECON: Payment to seller failed");

        // 3. Transfer protocol fee
        if (fee > 0) {
            (bool sentFee, ) = payable(feeRecipient).call{value: fee}("");
            require(sentFee, "ECON: Fee transfer failed");
        }

        // 4. Refund excess payment if any
        if (msg.value > price) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - price}("");
            require(refunded, "ECON: Excess refund failed");
        }

        emit ObjectPurchased(listingId, objId, msg.sender, seller, price, fee);
    }

    function getListing(bytes32 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function totalListings() external view returns (uint256) {
        return allListingIds.length;
    }
}
