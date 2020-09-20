const puppeteer = require("puppeteer");
const {
    URL
} = require("url");
const {
    v3
} = require('uuid');
const request = require("request");
var fs = require('file-system');

var models = require('./models');

(async () => {
    const start = new Date().getTime();

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.setViewport({
        width: 1200,
        height: 800,
    });

    let productCount = 0;

    for (let i = 1; i <= 4; i++) {

        await page.goto(process.env.SCRAP_URL.replace('%page%',i));

        await autoScroll(page);

        const productUrls = await page.$$eval('.laberProductGrid .laberProduct-image a.thumbnail', el => el.map(x => x.getAttribute("href")));
        let cpt = 1;
        for (let productUrl of productUrls) {

            const productHref = (new URL(productUrl, page.url())).href;

            await page.goto(productHref);

            const brand = await page.$eval('.breadcrumb li:nth-child(3)', elt => elt.textContent);
            const model = await page.$eval('.breadcrumb li:nth-child(5)', elt => elt.textContent);
            const price = await page.$eval('.current-price [itemprop="price"]', elt => elt.textContent);
            const availability = await page.$eval('#product-availability', elt => elt.textContent);
            let soldCount = "0";
            try {
                soldCount = await page.$eval('span.prosold-nbr', elt => elt.textContent);
            } catch(error) {

            }
            const category = await page.$eval('.breadcrumb li:nth-child(4)', elt => elt.textContent);
            const name = await page.$eval('.laberProduct [itemprop="name"]', elt => elt.textContent);

            const productImages = await page.$$eval('.product-cover > img', el => el.map(x => x.getAttribute("src")));
            const re = new RegExp(String.fromCharCode(160), "g");

            models.Product.create({
                brand: brand.trim(),
                model: model.trim(),
                price: parseFloat(price.replace(re,'').replace(",", ".")),
                availability: availability.trim().replace('', '').trim(),
                soldCount: soldCount && parseInt(soldCount.replace(' ','').trim()),
                category: category.trim(),
                name: name.trim(),
                description: ""
            }).then(function (product) {
                for (let img of productImages) {
                    const imgUrl = (new URL(img, page.url())).href
                    const imgName = v3(imgUrl, v3.URL) + "." + imgUrl.split('.').pop();

                    request
                        .get(imgUrl)
                        .pipe(fs.createWriteStream('./images/' + imgName));
                }
            });

            productCount++;

            if(cpt > 2) break;

            cpt++;
        }
    }

    const end = new Date().getTime();

    console.log("Products processed : " + productCount);
    console.log("Time in seconds : ", (end - start) / 1000);
})();

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}