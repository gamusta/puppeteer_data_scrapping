
const puppeteer = require("puppeteer");
const {URL} = require("url");
const { v3 } = require ('uuid');
const request = require("request");
var fs = require('file-system');

(async () => {
    const start = new Date().getTime();

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.setViewport({
      width: 1200,
      height: 800,
    });

    await page.goto('https://iparts.ma/fr/recherche?controller=search&orderby=position&orderway=desc&search_category=all&s=afficheur&submit_search=');
    
    //await autoScroll(page);

    const productUrls = await page.$$eval('.laberProduct-image a.thumbnail', el => el.map(x => x.getAttribute("href")));
    let cpt = 1;
    for (let productUrl of productUrls) {

        const productHref = (new URL(productUrl, page.url())).href;

        console.log('processing ' + productHref);
        
        await page.goto(productHref);

        const name = await page.$eval('.laberProduct [itemprop="name"]', elt => elt.textContent);    
        console.log('*** name => ' + name);

        const price = await page.$eval('.current-price [itemprop="price"]', elt => elt.textContent);
        console.log('*** price => ' + price);

        const productImages = await page.$$eval('.product-cover > img', el => el.map(x => x.getAttribute("src")));
        for (let img of productImages) {
            const imgUrl = (new URL(img, page.url())).href
            const imgName = v3(imgUrl, v3.URL)+"."+imgUrl.split('.').pop();
            
            request
                .get(imgUrl)
                .pipe(fs.createWriteStream('./images/'+imgName));
        }

        cpt++;
        if(cpt>2) {
            break;
        }
    }

    const end = new Date().getTime();
    console.log("Time in seconds : ", (end - start)/1000);
})();

async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}
