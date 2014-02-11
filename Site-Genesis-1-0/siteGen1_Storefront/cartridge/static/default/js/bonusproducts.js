/*
 * All java script logic for bonus products handling.
 *
 * It contains all the client side script code for the 
 * UI interactions for bonus products.
 *
 * The code relies on the jQuery JS library to
 * be also loaded.
 *
 * The logic extends the JS namespace app.*
 */
(function(app){
	if (app) {
		
		// add BonusProductLI namespace to app namespace
		app.BonusProductLI = function(response) {

			// BonusProductLI json data
			var model 			= response.data;

			// Product instance
			return {
				pid					: model.ID,
				name				: model.name,
				qty					: model.qty,
				options				: model.options.attributes,
				variations			: model.variations.attributes,
				lineItemCtnrUUID 	: model.lineItemCtnrUUID,
				subProducts			: [] // array to keep sub products instances 
			}
		},
	
		// add bonusproducts to namespace
		app.bonusproducts = {
			
			// the current list of bonus products
			products : null,
			
			// add click handler to each bonus product link
			bindClickToAllLinks : function() {
			
				// unbind the product add to cart
				jQuery(document).unbind("AddToCart");
				
				// add the bonus products to the cart
				jQuery("div.bonusaddtocart button").unbind("click").click(function(e) {
					app.bonusproducts.products.addToCart();
					return false;
				});
				
				// bind clear events
				jQuery("div.bonusproductfooter a").click(function(e) {	
					var bonusProductLI = jQuery(this).parents()[1].id;	
					app.bonusproducts.products.clearProduct(app.bonusproducts.products.get(bonusProductLI));
					return false;
				});
			},		
			
			// if this is a variant product hide all other swatches
			hideVariantSwatches : function (thisProduct) {				
				if (thisProduct.variant)
				{
					// loop thru all the swatches
					jQuery(thisProduct.containerId + " .variationattributes .swatches").each(function(){
						var thisSwatch 	= jQuery(this);
						var pdpVarId 	= thisSwatch.data("data"); // data is id which is set via app.hiddenData onload
						var attrDef 	= thisProduct.getAttrByID(pdpVarId);
						
						if (!attrDef) {
							return;
						}
						
						// all empty swatch anchors
						var varJqryObjs = thisSwatch.find("li.emptyswatch");
						
						// hide non applicable swatches
						varJqryObjs.each(function(){
							jQuery(this).hide();	
						});
					});
				}
			},
			
			// add a sub product to it's master
			addSubProduct : function(containerId, bonusProduct, lastSubProduct) {
				app.bonusproducts.products.addSubProduct(containerId, bonusProduct, lastSubProduct);
			},
			
			// add a sub product to it's master for a selected product
			addSelectedSubProduct : function(selectedBonusProduct) {
				app.bonusproducts.products.addSelectedSubProduct(selectedBonusProduct);
			},
						
			// binds A2C button click handler to add bonus product to selection list
			getAddToCartBtn : function(thisProduct, masterProduct) {
				
				// register this product if it's a master
				if (masterProduct) {
					app.bonusproducts.products.registerMaster(thisProduct);
				}
				
				var addToCartBtn = jQuery(thisProduct.containerId+" .addtocartbutton:last").unbind("click").click(function(e) {
					var qty = jQuery(thisProduct.containerId+" .quantityinput:last").val();
					
					if (app.bonusproducts.products.getAvailableProductsCount() > 0 && app.bonusproducts.products.getAvailableProductsCount() >= qty) {
						app.bonusproducts.products.addProduct(thisProduct, qty);
					} else {
						alert(app.resources["BONUS_PRODUCT_MAX"]);
					}
				});
				return addToCartBtn;
			},
			
			// initial setup of a bonus product
			init : function(thisProduct, masterProduct) {
				
				// register this product if it's a master
				if (masterProduct) {
					app.bonusproducts.products.registerMaster(thisProduct);
				}
				
				// if it's a variant product hide all non applicable swatches
				if (thisProduct.variant) {
					this.hideVariantSwatches(thisProduct);
				}
				
				// bind the A2C button
				return this.getAddToCartBtn(thisProduct, masterProduct);
			},
			
			// enable all select buttons
			enableSelectBtns : function() {
				jQuery(".addtocartbutton").each(function(){							
					jQuery(".addtocartbutton").removeAttr("disabled");
				});
			},

			// disable all select buttons
			disableSelectBtns : function() {
				jQuery(".addtocartbutton").each(function(){		
					jQuery(".addtocartbutton").attr("disabled", "true");
				});
			},
			
			// bonus products object
			BonusProducts : function(uuid, selectedBonusProducts, maxBonusProducts) {
				this.bonusProducts = [];
				this.masterBonusProducts = [];
				this.uuid = uuid;
				this.maxBonusProducts = maxBonusProducts;
				
				// init the the bonus products
				this.init = function() {
					this.updateAvailable();
				};
				
				// retrieves a registered product by bonusProductLI
				this.get = function(bonusProductLI) {
					for(var i=0; i<this.bonusProducts.length; i++) {
						if(this.bonusProducts[i].bonusProductLI == bonusProductLI) return this.bonusProducts[i];
					}
					return null;
				};
			
				// registers and adds the a bonus product
				this.register = function(bonusProduct) {		
					idx = this.bonusProducts.length;
					this.bonusProducts[idx] = bonusProduct;
				};	
				
				// registers the master product
				this.registerMaster = function(bonusProduct) {	
					idx = this.masterBonusProducts.length;
					this.masterBonusProducts[idx] = bonusProduct;
				};

				// add all the bonus products to the cart
				this.addToCart = function() {
					
					// show the loader
					jQuery("#" + "bonusproductloader").html(app.showProgress("productloader"));
					jQuery("#" + "productresultarea").hide();
					
					// process each individual products in the set/bundle
					// and prepare product.selectedOptions for final submission
					var pid = "";			
					var childPids = "";
					var productComma = ","; 
					
					// build json string for all bonus products to add
					var bonusProductsJSONString = "{\"bonusproducts\": [";
					var optionsJSONString = "";

					// loop through all the bonus products and add them to the cart
					for(var i=0; i<this.bonusProducts.length; i++) {		
						thisProduct = this.bonusProducts[i].product;
						
						if (i == this.bonusProducts.length - 1) {
							productComma = ""; // at the end of the list
						}
						
						// already added product, just send the data back							
						if (this.bonusProducts[i].existingBonusProduct) {
							pid = thisProduct.pid;			
							
							// get the options 
							for (var j=0; j<thisProduct.options.length; j++) {	
								optionsJSONString += "\"optionName\":\"" + thisProduct.options[i].htmlName + "\", \"optionValue\":\"" + thisProduct.options[i].selectedValue + "\"";
							}
							
							// get the list of sub product ids.
							if (thisProduct.subProducts.length > 0) {												
								var subProducts = thisProduct.subProducts;
								var comma 		= ",";
								var subproduct;
								
								for (var j = 0; j < thisProduct.subProducts.length; j++) {
									subproduct = subProducts[j];
									
									if (j == subProducts.length - 1) {
										comma = ""; // at the end of the list
									}
									childPids += subproduct.pid+comma;
								}
							}
						}else {
							if (thisProduct.master || thisProduct.variant) {
								// it is necessary to update the option id to be variant-specific
								jQuery(this.bonusProducts[i].product.containerId+" .product_options:last select").each(function(){
									 var value = thisProduct.selectedOptions[this.id];
									 var newId = this.id.replace(thisProduct.pid, thisProduct.selectedVar.id);
									 thisProduct.selectedOptions[newId] = value; 
									 delete thisProduct.selectedOptions[this.id];
								});					
								pid = thisProduct.selectedVar.id;	
							}
							else {	
								pid = thisProduct.pid;		
								
								// check if we are adding a bundle/productset to the cart
								if (thisProduct.subProducts.length > 0) {												
									var subProducts = thisProduct.subProducts;
									var comma 		= ",";
									var subproduct;
									
									// process each individual products in the set/bundle
									// and prepare product.selectedOptions for final submission
									for (var j = 0; j < thisProduct.subProducts.length; j++) {
										subproduct = subProducts[j];
										
										if (j == subProducts.length - 1) {
											comma = ""; // at the end of the list
										}
										
										// see if any of the sub products are variations, if so then get the selected variation id
										// from selectedVar property and make it a comma separated list
										if (subproduct.variant || subproduct.master) {									
											if (subproduct.selectedVar == null) {
												return false;
											}
											childPids += subproduct.selectedVar.id+comma;
										}
										else {
											childPids += subproduct.pid+comma;
										}
									}
								}	
								
								// get the options for each of the bonus products that were selected
								var productOpt = jQuery(this.bonusProducts[i].product.containerId+" .product_options:last select");
								productOpt.each(function(i) {
										var vals = this.options[this.selectedIndex].value.split("%?%"); // 0 = value, 1 = price
										optionValue = vals[0];
										optionsJSONString = "\"optionName\":\"" + this.id + "\", \"optionValue\":\"" + optionValue + "\"";
								});	
							}
						}

						// build the JSON for bonus products
						bonusProductsJSONString += "{\"product\": {\"pid\":\"" + pid + "\", \"qty\":\"" + this.bonusProducts[i].qty + "\", \"options\" : {" + optionsJSONString + "}";;
						
						// get the subproducts
						if (childPids != "") {
							bonusProductsJSONString += ",  \"childPids\":\"" + childPids + "\"";	
						}

						bonusProductsJSONString += "}}" + productComma;						
					}
					
					bonusProductsJSONString += "]}";
					bonusProductsObject = eval('(' + bonusProductsJSONString + ')');
					bonusProductsJSONText = JSON.stringify(bonusProductsObject);
					
					url = app.util.appendParamToURL(app.URLs.addBonusProduct,"bonusDiscountLineItemUUID", this.uuid);

					// add the bonus product to the cart
					jQuery.ajax({
						type	: "POST",
						url		: url,
						cache	: true,
						contentType : "application/json",
						data	: bonusProductsJSONText,
						success	: function(data) {
									jQuery("#" + "bonusproductloader").html("");
									jQuery('#BonusProductDialog').dialog('close');
									window.location.href = app.URLs.showCart;
								},
						error	: function(date) {
									jQuery("#" + "bonusproductloader").html("");
									jQuery("#" + "productresultarea").show();
								}
					});
				};			
			
				// clears the given bonus product
				this.clearProduct = function(bonusProduct) {	
					if(bonusProduct == null) return;

					// remove the link and text for the bonus product
					jQuery("div.bonusproductfooter #" + bonusProduct.bonusProductLI).remove();
					
					// remove the bonus product from the list
					for(var i=0; i<this.bonusProducts.length; i++) {
						if(this.bonusProducts[i].bonusProductLI == bonusProduct.bonusProductLI) {
							this.bonusProducts.splice(i,1);
							break;
						}
					}
					this.updateAvailable();
				};
				
				// adds the product as a bonus product to the list
				this.addProduct = function(product, qty) {	
					if(product == null) return;
					
					bonusProductOptionVariationText = "";
					
					if (product.master || product.variant) {
						bonusProductOptionVariationText += this.getProductVariationsText(product, product.containerId);
						bonusProductOptionVariationText += this.getProductOptionsText(product);						
					} else {
						for (var i = 0; i < product.subProducts.length; i++) {
							subproduct = product.subProducts[i];
							bonusProductOptionVariationText += this.getProductVariationsText(subproduct, subproduct.containerId);
						}						
						bonusProductOptionVariationText += this.getProductOptionsText(product);			
					}
										                            					
					// add the bonus product to the list
					bonusProduct = new app.bonusproducts.BonusProduct(product, qty, false);
					this.register(bonusProduct);

					// add the clear link and text for the bonus product
					selectedBonusProductText = "<ul id=\"" + bonusProduct.bonusProductLI + "\">" +
											"<li><a href=\"\" class=\"relax\"><img src=\"" + app.URLs.removeImg  + "\" alt=\"" + app.resources["REMOVE"] + "\"/></a><span>" + product.name  + "</span></li>" +
											"<li>Qty: " + bonusProduct.qty + "</li>";
					selectedBonusProductText += bonusProductOptionVariationText;
					selectedBonusProductText += "</ul>";
					jQuery("div.bonusproductfooter").append(selectedBonusProductText);
					
					app.bonusproducts.bindClickToAllLinks();					
					this.updateAvailable();				
				};
				
				// adds previously selected bonus product
				this.addSelectedProduct = function(product) {	
					if(product == null) return;
					
					var bonusProductOptionVariationText = this.getOptionsVariationsLIText(product);
										                            
					// add the bonus product to the list
					bonusProduct = new app.bonusproducts.BonusProduct(product, product.qty, true);
					this.register(bonusProduct);

					// add the clear link and text for the bonus product
					selectedBonusProductText = "<ul class=\"" + bonusProduct.bonusProductLI + "\" id=\"" + bonusProduct.bonusProductLI + "\">" +
											"<li><a href=\"\" class=\"relax\"><img src=\"" + app.URLs.removeImg  + "\" alt=\"" + app.resources["REMOVE"] + "\"/></a><span>" + product.name  + "</span></li>" +
											"<li>" + app.resources["QTY"] + bonusProduct.qty + "</li>";
					selectedBonusProductText += bonusProductOptionVariationText;
					selectedBonusProductText += "</ul>";
					jQuery("div.bonusproductfooter").append(selectedBonusProductText);
					
					app.bonusproducts.bindClickToAllLinks();
					this.updateAvailable();
				};
				
				// build a string of selected options for a product
				this.getProductOptionsText = function(product) {
					var displayText = "";
					
					// get the list of options for the product
					jQuery(product.containerId +" .product_options:last select").each(function(){
						var optionText = this.options[this.selectedIndex].text // 0 = value, 1 = price
						var optionName = jQuery(product.containerId +" .product_options:last").find("span.optiondisplayname").html();
						displayText += "<li>" + optionName + optionText + "</li>";
					});
					
					return displayText;
				};
				
				// build a string of selected variations for a product, if it's a subproduct the containerId from the 
				// master is also passed along.
				this.getProductVariationsText = function(product, containerId) {
					var displayText = "";
					
					// get the list of variations for the product
					jQuery(containerId + " .variationattributes .swatches").each(function(){
						var thisSwatch 	= jQuery(this);
						var varId 	= thisSwatch.data("data"); // data is id which is set via app.hiddenData onload
						var attrDef = product.getAttrByID(varId);
						var attrDefName = jQuery(this).find("span.label").html();
						displayText += "<li>" + attrDefName + " " + product.selectedVarAttribs[attrDef.id] + "</li>";
					});
					
					// get the list of non-swatches(drop down) attributes for the product
					jQuery(containerId + " .variationattributes .variantdropdown select").each(function(){
						var optionText = this.options[this.selectedIndex].text;
						var optionName = jQuery(containerId + " .variationattributes .variantdropdown").find("span.label").html();
						displayText += "<li>" + optionName + " " + optionText + "</li>";
					});
					
					return displayText;
				};
				
				// update the title of the dialog
				this.updateAvailable = function() {
					var availableText = app.resources["SELECT_BONUS_PRODUCT"] + " " + this.getAvailableProductsCount() + " " + app.resources["BONUS_PRODUCTS"];				
					jQuery("div.bonusproductfooter span.bonusproducttext").empty().html(availableText);
					
					if (this.getSelectedBonusProductsCount() < 1) {
						jQuery(".bonusaddtocartbutton").attr("disabled", "true");
					} else {
						jQuery(".bonusaddtocartbutton").removeAttr("disabled");
					}
				};
				
				// get the number of products available for selection
				this.getAvailableProductsCount = function() {
					var available = this.maxBonusProducts - this.getSelectedBonusProductsCount();
					return available;
				};
				
				// get the number of bonus products selected
				this.getSelectedBonusProductsCount = function() {
					var qty = 0;
					
					// remove the bonus product from the list
					for(var i=0; i<this.bonusProducts.length; i++) {						
						qty = qty + parseInt(this.bonusProducts[i].qty);
					}
					return qty;
				};
				
				// add the sub product to it's master, use the container id to find the master product
				this.addSubProduct = function(containerId, bonusProduct, lastSubProduct) {					
					containerId = "#" + containerId;
					for(var i=0; i<this.masterBonusProducts.length; i++) {
						if(this.masterBonusProducts[i].containerId == containerId) {
							this.masterBonusProducts[i].subProducts.push(bonusProduct);

							// setup the binding for bundle/subproducts
							if (lastSubProduct == "true" ) {
								this.masterBonusProducts[i].getSubProductsBinding();
							}
						}
					}
				};
				
				// add previously selected sub product to it's master and add the selected text
				this.addSelectedSubProduct = function(selectedBonusProduct) {	
					for(var i=0; i<this.bonusProducts.length; i++) {
						if(this.bonusProducts[i].existingBonusProduct && this.bonusProducts[i].product.lineItemCtnrUUID == selectedBonusProduct.lineItemCtnrUUID) {
							this.bonusProducts[i].product.subProducts.push(selectedBonusProduct);							
							var bonusProductOptionVariationText = "<li>" + selectedBonusProduct.name + "</li>";
							bonusProductOptionVariationText += this.getOptionsVariationsLIText(selectedBonusProduct);
							jQuery("ul." + this.bonusProducts[i].product.pid).append(bonusProductOptionVariationText);
						}
					}
				};
				
				// build the li text for options and variations of a product
				this.getOptionsVariationsLIText = function(product) {
					var bonusProductOptionVariationText = "";
					
					// get the options display text
					for (var j=0; j<product.options.length; j++) {	
						bonusProductOptionVariationText += "<li>" + product.options[j].selectedDisplayValue + "</li>";
					}
					
					// get the variations display text
					for (var j=0; j<product.variations.length; j++) {						
						bonusProductOptionVariationText += "<li>" + product.variations[j].displayName + ": " + product.variations[j].selectedDisplayValue + "</li>";
					}
					
					return bonusProductOptionVariationText;
				};
				
			},
			
			// Bonus product object contains all selected bonus product for a bonus discount line item,
			// this includes previously selected bonus product or ones selected from the current selection window.
			// Previously selected bonus product are of type app.BonusProductLI.
			// Current selected bonus products are of type app.Product.
			BonusProduct : function(product, qty, existingBonusProduct) {
				this.product = product;
				this.qty = qty;
				this.existingBonusProduct = existingBonusProduct;
				var randomnumber = Math.floor(Math.random()*1000);
				this.bonusProductLI = product.pid + "_" + randomnumber;
			}
		} // end bonusproduct
	} else {
		// name space has not been defined yet
		alert("app namespace is not loaded yet!");
	}
})(app);
