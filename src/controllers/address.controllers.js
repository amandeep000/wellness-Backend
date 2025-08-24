import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.utils.js";
import { ApiResponse } from "../utils/ApiResponse.utils.js";
import { AsyncHandler } from "../utils/AsyncHandler.js";

const addAddress = AsyncHandler(async (req, res) => {
  const {
    type,
    fullname,
    street,
    city,
    state,
    postalCode,
    country,
    phoneNumber,
    isDefault,
  } = req.body;
  if (
    !fullname ||
    !street ||
    !city ||
    !postalCode ||
    !country ||
    !phoneNumber ||
    !state
  ) {
    throw new ApiError(400, "All required address fields must be provided");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  let defaultFlag = isDefault;
  if (user.addresses.length === 0) {
    defaultFlag = true;
  } else if (isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }
  user.addresses.push({
    type,
    fullname,
    street,
    city,
    state,
    postalCode,
    country,
    phoneNumber,
    isDefault: defaultFlag,
  });
  await user.save();
  res
    .status(201)
    .json(new ApiResponse(201, user.addresses, "Address added successfully"));
});

const updateAddress = AsyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const {
    type,
    fullname,
    street,
    city,
    state,
    postalCode,
    country,
    phoneNumber,
    isDefault,
  } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found!");
  }
  const address = user.addresses.id(addressId);
  if (!address) throw new ApiError(404, "Address not found");

  if (type !== undefined) address.type = type;
  if (fullname) address.fullname = fullname;
  if (street) address.street = street;
  if (city) address.city = city;
  if (state) address.state = state;
  if (postalCode) address.postalCode = postalCode;
  if (country) address.country = country;
  if (phoneNumber) address.phoneNumber = phoneNumber;

  if (isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
    address.isDefault = true;
  }

  if (isDefault !== undefined && isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
    address.isDefault = true;
  } else if (isDefault !== undefined && !isDefault) {
    if (address.isDefault && user.addresses.length > 1) {
      address.isDefault = false;
      const otherAddress = user.addresses.find(
        (addr) => addr._id.toString() !== addressId
      );
      if (otherAddress) otherAddress.isDefault = true;
    }
  }
  await user.save();
  res
    .status(200)
    .json(new ApiResponse(200, user.addresses, "Address updated successfully"));
});

const deleteAddress = AsyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found!");
  }
  const address = user.addresses.id(addressId);
  if (!address) throw new ApiError(404, "Address not found");

  if (user.addresses.length === 1) {
    throw new ApiError(
      400,
      "Cannot delete the only address. Please add another address first."
    );
  }

  const wasDefault = address.isDefault;
  address.remove();

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  res
    .status(200)
    .json(new ApiResponse(200, user.addresses, "Address deleted successfully"));
});

const getAllAddresses = AsyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  res
    .status(200)
    .json(
      new ApiResponse(200, user.addresses, "Addresses fetched successfully")
    );
});
const getAddressById = AsyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const address = user.addresses.id(addressId);
  if (!address) throw new ApiError(404, "Address not found");

  res
    .status(200)
    .json(new ApiResponse(200, address, "Address fetched successfully"));
});

export {
  addAddress,
  updateAddress,
  deleteAddress,
  getAllAddresses,
  getAddressById,
};
