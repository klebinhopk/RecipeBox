//=====set up===
var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app     = express();
var mongoose = require('mongoose'); //MongoDB
var passport = require('passport');
var flash 	 = require('connect-flash');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
app.use(bodyParser());

// configuration ===========================================
		
	// config files
	var db = require('./config/db');

	var port = process.env.PORT || 8080; // set our port
	mongoose.connect(db.url); // connect to our mongoDB database
	
    app.use(express.static(__dirname + '/public'));
 
		
       require('./config/passport')(passport); // pass passport for configuration

		// set up our express application
		app.use(morgan('dev')); // log every request to the console
		app.use(cookieParser()); // read cookies (needed for auth)
		app.set('view engine', 'ejs'); // set up ejs for templating
		// required for passport
		app.use(session({ secret: 'ilovescotchscotchyscotchscotch' })); // session secret
		app.use(passport.initialize());
		app.use(passport.session()); // persistent login sessions
		app.use(flash()); // use connect-flash for flash messages stored in session
	// routes ==================================================

	require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// define model =================
var recipe = mongoose.model('recipe', {
		text : String
});




var posturl = ""
// This route receives the posted form.
// As explained above, usage of 'body-parser' means
// that `req.body` will be filled in with the form elements
app.post('/', function(req, res){
  posturl = req.body.url;
 if (req.user) {
	 res.redirect('/scrape');
  	 var loading = "<i class='icon-spinner icon-spin icon-large'></i>";
   //res.render('index.ejs'); // load the index.ejs file

} else {
    res.redirect('/login');
}
 
});


//=====web scraper for Food Network recipes===
app.get('/scrape', function(req, res){
	var validurl = "foodnetwork.com/recipes/";
	url = posturl;
	//Appends http:// to urls to ensure proper scraping
	if(url.substr(0,3) == "www")
	{
		url = "http://" + url
	}
	//Checks url to ensure it matches the supported websites
	if(url.indexOf(validurl) == -1)
	{
	    html = "<div class='alert alert-danger'>Error Loading Recipe</div>";
	    res.render('index.ejs',{
			user:req.user,
			errormessage:html
		});
	}
	else{
		request(url, function(error, response, html){ 
		if(!error){
			var $ = cheerio.load(html);

			var food, ingredients, directions, image;
			var json = { name : "", image: "", ingredients : "", directions : ""};
	
			//Get name of food item
			$('.tier-3.title').filter(function(){
		        var data = $(this);
		        name = data.children().first().text();

		        json.name = name;
	        })

			 //Get food image url
	        $('.col12.pic.collapsed').filter(function(){
	        	var data = $(this).find('img');
	        	image = data.attr('src');
	        	json.image = image;	
	        })
	        
			//Get ingredients separated by ::
	        $('.col6.ingredients').filter(function(){
	        	var data = $(this);
	        	var list = data.children().last().children();
	        	var parts = [];
	        	ingredients = ""
	        	list.each(function(i, elem) {
  					parts[i] = $(this).text();
  					ingredients += parts[i] + "//";
				});
	        	json.ingredients = ingredients;
	        })
	        
	       
	        //Get directions separated by ::
	        $('.col12.directions').filter(function(){
	        	var data = $(this);
	        	var list = data.children().nextUntil($('.categories'));
	        	var parts = [];
	        	directions = ""
	        	list.each(function(i,elem){
	        		parts[i] = $(this).text();
	        		directions += parts[i] + "//";
	        	});
	        	json.directions = directions;	
	        })
        
		}
		
			req.user.recipes.push(json);
			
			req.user.save(function(err) {
                    if (err)
                        throw err;
                });      
		res.redirect('/sort');
		});
		}
	

});

//Deletes Recipe from Collection
app.get('/delete', function(req, res){
var deleteid = req.query.item;
var temp = [];
temp = req.user.recipes;
temp.splice(deleteid,1);
	req.user.recipes = temp;
	req.user.save(function(err) {
             	 if (err)
                	throw err;
                });      
	res.redirect('/');
	res.render('index.ejs',{user:req.user,errormessage:""});

});

//Sorts Recipes Alphabetically
app.get('/sort', function(req, res){
	var temp = [];
	temp = req.user.recipes;
	temp.sort(compare);
	req.user.recipes = temp;
	req.user.save(function(err) {
         if (err)
                throw err;
                }); 
	res.render('index.ejs',{user:req.user,errormessage:""});
});

//Helper function for sort
function compare(a,b) {
  if (a.name < b.name)
     return -1;
  if (a.name > b.name)
    return 1;
  return 0;
}



app.listen('8081');
console.log('Magic happens on port 8081');
exports = module.exports = app;
