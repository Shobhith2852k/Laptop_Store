const express=require('express');
const app=express();
const MongoClient=require('mongodb');
const bodyparser=require('body-parser');
const excel = require('exceljs');
var db;

MongoClient.connect('mongodb://localhost:27017/LaptopInventory',(err,database)=>{
	if(err) return console.log(err);
	db=database.db('LaptopInventory');
	app.listen(2000,()=>{
		console.log("Running on port 3000");
	})
})

app.set('view engine','ejs');
app.use(bodyparser.urlencoded({extended : true}));
app.use(bodyparser.json());
app.use(express.static('public'))

app.get('/',(req,res)=>{
	db.collection('Laptops').find().toArray((err,result)=>{
		if(err) return console.log(err);
		res.render('Home.ejs',{data:result});
	})
})


app.get('/create',(req,res)=>{
	res.render("add.ejs");
})
app.get('/home',(req,res)=>{
	res.redirect("/");
})

app.get('/edit',(req,res)=>{
	var id=req.query.id;
	db.collection('Laptops').find().toArray((err,result)=>{
		if(err) return console.log(err);
		res.render('edit.ejs',{data:{id:id,Laptops:result}});
	})
})

app.post('/Add',(req,res)=>{
	db.collection('Laptops').save(req.body,(err,result)=>{
		if(err) return console.log(err);
		res.redirect('/');
	})
})

app.post('/delete',(req,res)=>{
	var id=req.body.id;
	var query={id:id}
	db.collection('Laptops').deleteOne(query,(err,result)=>{
		if(err) return console.log(err);
		res.redirect('/');
	})
})

app.post('/editupdate',(req,res)=>{
	var oldQuantity;
	var DATE=new Date();
	let day = ("0" + DATE.getDate()).slice(-2);
	let month = ("0" + (DATE.getMonth() + 1)).slice(-2);
	let year = DATE.getFullYear();
	var date=day.toString()+"-"+month.toString()+"-"+year.toString();
	var price;
	var quantity;
	var t_price;
	var change;
	var set=0;
	var id={id:req.body.id};
	var newValue;
	var costprice;
	db.collection('Laptops').find().toArray((err,result)=>{
		for(var i=0;i<result.length;i++){
			if(result[i].id==req.body.id){
				oldQuantity=result[i].quantity;
				costprice=result[i].costprice;
				if(parseInt(req.body.quantity)+parseInt(oldQuantity)<parseInt(oldQuantity)){
					price=result[i].sellingprice;
					quantity=parseInt(req.body.quantity)*-1;
					t_price=(parseInt(req.body.quantity))*parseInt(req.body.sellingprice)*-1;
				}
				break;
			}
		}
		if(parseInt(req.body.quantity)+parseInt(oldQuantity)<0){
			set=1;
			change=(parseInt(req.body.quantity)+parseInt(oldQuantity))*-1;
			newValue={ $set :{quantity:0,sellingprice:req.body.sellingprice}};
			quantity=quantity-change;
		}
		else{newValue={ $set :{quantity:parseInt(req.body.quantity)+parseInt(oldQuantity),sellingprice:req.body.sellingprice}};}
		db.collection('Laptops').updateOne(id,newValue,(err,result)=>{
			if(err) return console.log(err);
			if(parseInt(req.body.quantity)+parseInt(oldQuantity)<parseInt(oldQuantity)){
				db.collection('SalesDetails').find({id:req.body.id}).toArray((err,da)=>{
					var flag=0;
					for(var k=0;k<da.length;k++){
					if(da[k].purchasedate==date){
						flag=1;
						console.log("inside");
						var total=(da[k].totalprice+t_price);
						var quan=da[k].quantity+quantity;
						var updatequery={ $set :{quantity:quan,totalprice:total}};
						var _id={_id:da[k]._id};
						db.collection('SalesDetails').updateOne(_id,updatequery,(err, bookresult)=>{
							if(err) return console.log("err");
						})
					}}
					if(flag==0){
						console.log("today");
						var q={purchasedate:date,id:req.body.id,costprice:costprice,sellingprice:req.body.sellingprice,quantity:(quantity),totalprice:t_price}
						db.collection('SalesDetails').insertOne(q,(err,resultsale)=>{
							if(err) return console.log(err);
						})
					}
				})
			}
			res.redirect('/');
		})
	})
})


app.get('/sales',(req,res)=>{
	db.collection('SalesDetails').find().toArray((err,result)=>{
		if(err) return console.log("err");
		res.render('SalesDetails.ejs',{data:result});
	})
	
})

app.get('/updatesale',(req,res)=>{
	res.render("updatesales.ejs");
})

app.post('/salesUpdate',(req,res)=>{
	db.collection('SalesDetails').find({id:req.body.id,purchasedate:req.body.purchasedate}).toArray((err,result)=>{
		if(result.length==0){
			console.log("Couldn't found id or date");
		}
		else{
		if(err) return console.log(err);
		var t_price=parseInt(result[0].totalprice)-(parseInt(req.body.quantity)*parseInt(result[0].sellingprice)*-1);
		var quantity=parseInt(result[0].quantity)+parseInt(req.body.quantity);
		var query1={ $set :{quantity:quantity,totalprice:t_price}}
		var query={ _id :result[0]._id}
		var id=req.body.id;
		var qq=parseInt(req.body.quantity)*-1;
		if(quantity<=0){
			if(quantity<0){
				qq=result[0].quantity;
			}
			db.collection('SalesDetails').deleteOne(query,(err,resultdel)=>{
				if(err) return console.log(err);
			})
		}
		else{
		db.collection('SalesDetails').updateOne(query,query1,(err,results)=>{
			if(err) return console.log(err);
		})}
		db.collection('Laptops').find({id:req.body.id}).toArray((err,resultsss)=>{
			if(err) return console.log(err);
			var q=(qq)+resultsss[0].quantity;
			var qr={ $set :{quantity:q}}
			db.collection("Laptops").updateOne({id:req.body.id},qr,(err,resultss)=>{
				if(err) return console.log(err);
			})
		})
		}
		res.redirect('/sales')
		
	})
})

app.post('/excel',(req,res)=>{
	db.collection('SalesDetails').find().toArray((err,result)=>{
		if(err) return console.log(err);
		let workbook = new excel.Workbook(); 
		let worksheet = workbook.addWorksheet('SalesDetails');
		worksheet.columns = [
			{header:'Purchase_Date',key:'purchasedate',width:20 },
			{ header: 'BookId', key: 'id', width: 10 },
			{ header: 'Price', key: 'sellingrice', width: 10 },
			{ header: 'Quantity', key: 'quantity', width: 10 },
			{ header: 'Total Price', key: 'totalprice', width: 10, outlineLevel: 1}
		];
		worksheet.addRows(result);
		workbook.xlsx.writeFile("sales.xlsx").then(function() {
			console.log("file saved!");
		});
		res.redirect('/sales');
	})
})