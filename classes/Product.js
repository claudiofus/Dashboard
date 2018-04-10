function Product(UPC) {
    this.UPC = UPC;
}

Product.prototype.setCreationDate = function(date) {
    this.CreatedAt = date.toISOString();
};

Product.prototype.setDescription = function(descr) {
    this.Description = descr;
};

Product.prototype.setPrice = function(price) {
    this.Price = price;
};

Product.prototype.setQuantity = function(quantity) {
    this.Quantity = quantity;
};

Product.prototype.setASIN = function(ASIN) {
    this.ASIN = ASIN;
};

Product.prototype.setSKU = function(SKU) {
    this.SKU = SKU;
};

module.exports = Product;