/*
 * All javascript logic for the Virtual Piggy integration.
 *
 * The code relies on the jQuery JS library to
 * be also loaded.
 *
 * The logic extends the JS namespace app.*
 */
(function(app, $, undefined) {
	
	app.virtualpiggy = {

		loginDialogParams : {},
		URLs : {},
		
		init : function (urlInit) {
			app.virtualpiggy.loginDialogParams = {
				height : 300,
				width : 600,
				dialogClass : 'titleStuff', 
				autoOpen : false,
				resizable : false,
				position : 'center',
				buttons: {
					"Login": app.virtualpiggy.buttonLoginHandler,
					"Signup": app.virtualpiggy.buttonSignupHandler,
					"Close": app.virtualpiggy.buttonCloseHandler					
				},
				open: function () {
					$('#vplogindialog').keypress(function(e) {
						if (e.keyCode == $.ui.keyCode.ENTER) {
					    	$(this).parent().find("button:eq(0)").trigger("click");
						}
					});
					$('.ui-dialog-buttonpane').find('button:contains("Login")').addClass('buttonLogin').text('');
					$('.ui-dialog-buttonpane').find('button:contains("Signup")').addClass('buttonSignup').text('');;
					$('.ui-dialog-buttonpane').find('button:contains("Close")').addClass('buttonClose').text('');;					
					$('#vplogindialog').css('overflow', 'hidden'); 					
				},
				close: function () {
					$('#vplogindialog input').val('');
					$("#vplogindialogerror").text('');
				} 
			};
			
			var options = app.virtualpiggy._prepareOptionsInitAjax(urlInit);
			
			app.virtualpiggy.ajax.getJson(options);
		},
		
		dialogLoginInit : function () {
			$('#vplogindialog').dialog(app.virtualpiggy.loginDialogParams);
			$("#vplogindialog").siblings('div.ui-dialog-titlebar').remove();
			
			
		},
		
		buttonShowDialogHandler : function () {
			$('#vplogindialog').dialog('open');
			return false;
		},
		
		buttonLoginHandler : function () {
			var username = $("#vpusername").val();
			var password = $("#vppassword").val();
			var options = {
				"url" : app.virtualpiggy.URLs.auth,
				"data" : {
					"username":username,
					"password":password
				},
				"callback":function(response) {
					if (response && response.status == "true") {
						window.location.href = app.virtualpiggy.URLs.checkout;
					} else {
						$("#vplogindialogerror").text((response && response.errorMessage) ? response.errorMessage : "Unknown error");
					}
				}
			};
			var response = app.virtualpiggy.ajax.getJson(options);
		},
		
		buttonSignupHandler : function () {
			$("#vpusername").val("");
			$("#vppassword").val("");
			window.open('https://users.virtualpiggy.com/registration', '_blank')			
		},
        buttonCloseHandler : function () {
            $(this).dialog("close");
            $("#vpusername").val("");
            $("#vppassword").val("");
        },		
		/**
		 * This is copy of the app.util.toAbsoluteUrl method from SiteGenesis 12.5
		 */
		
		_toAbsoluteUrl : function (url) {
			if (url.indexOf("http")!==0 && url.charAt(0)!=="/") {
				url = "/"+url;
			}
			return url;
		},
		
		_prepareOptionsInitAjax : function (urlInit) {
			var options = {
				url: urlInit,
				callback: function (data) {
					$.extend(app.virtualpiggy, data);
				}
			};
			
			return options;
		}
		
		

	};
}(window.app = window.app || {}, jQuery));


/**
 * This is a mostly absolute copy of app.ajax v12.5
 * Native app.ajax isn't used because of general integrations requirements
 */
(function (app, $) {

	var currentRequests = [];
	// request cache

	// sub namespace virtualpiggy.* contains application specific ajax components
	app.virtualpiggy.ajax = {
		// ajax request to get json response
		// @param - async - boolean - asynchronous or not
		// @param - url - String - uri for the request
		// @param - data - name/value pair data request
		// @param - callback - function - callback function to be called
		getJson : function (options) {
			options.url = app.virtualpiggy._toAbsoluteUrl(options.url);
			// return if no url exists or url matches a current request
			if(!options.url || currentRequests[options.url]) {
				return;
			}
						
			currentRequests[options.url] = true;

			// make the server call
			$.ajax({
				dataType : "json",
				url : options.url,
				async : (typeof options.async==="undefined" || options.async===null) ? true : options.async,
				data : options.data || {}
			})
			// success
			.done(function (response, status, xhr) {
				if(options.callback) {
					options.callback(response);
				}
			})
			// failed
			.fail(function (xhr, textStatus) {
				if(textStatus === "parsererror") {
					window.alert(app.resources.BAD_RESPONSE);
				}
				if(options.callback) {
					options.callback(null);
				}
			})
			// executed on success or fail
			.always(function () {
				// remove current request from hash
				if(currentRequests[options.url]) {
					delete currentRequests[options.url];
				}
			});
		},
		// ajax request to load html response in a given container

		// @param - url - String - uri for the request
		// @param - data - name/value pair data request
		// @param - callback - function - callback function to be called
		// @param - target - Object - Selector or element that will receive content
		load : function (options) {
			options.url = app.util.toAbsoluteUrl(options.url);
			// return if no url exists or url matches a current request
			if(!options.url || currentRequests[options.url]) {
				return;
			}

			currentRequests[options.url] = true;

			// make the server call
			$.ajax({
				dataType : "html",
				url : app.util.appendParamToURL(options.url, "format", "ajax"),
				data : options.data
			})
			.done(function (response) {
				// success
				if(options.target) {
					$(options.target).empty().html(response);
				}
				if(options.callback) {
					options.callback(response);
				}

			})
			.fail(function (xhr, textStatus) {
				// failed
				if(textStatus === "parsererror") {
					window.alert(app.resources.BAD_RESPONSE);
				}
				options.callback(null, textStatus);
			})
			.always(function () {
				app.progress.hide();
				// remove current request from hash
				if(currentRequests[options.url]) {
					delete currentRequests[options.url];
				}
			});
		}
	};
}(window.app = window.app || {}, jQuery));
