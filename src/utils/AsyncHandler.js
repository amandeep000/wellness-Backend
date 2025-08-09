const asyncHandler = (reqHandler) => {
  return (req, res, next) => {
    return Promise.resolve(reqHandler(req, res, next)).catch((error) =>
      next(error)
    );
  };
};

export { asyncHandler };
