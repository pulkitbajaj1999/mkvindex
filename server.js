// server.js
const express = require("express");
const cors = require('cors')
const path = require("path");
const fs = require("fs").promises

const app = express();
const PORT = process.env.PORT || 8000; // or any PORT you prefer

let JSON_FULL_DATA = []

async function fetchJsonObjFromFile(page) {
  let res;
  try {
    let text = await fs.readFile(`json_pages/${page}.json`, "utf-8");
    let obj = JSON.parse(text);
    res = obj;
  } catch (err) {
    console.error(`[error][fetchjsonobjfromfile] ${err}`);
    res = {}
  }
  return res
}

async function loadDataInMemory() {
  for (let i = 1; i <= 37; i++) {
    try {
      let pageData =  await fetchJsonObjFromFile(i)
      let mappedDataArr = pageData.map(el => ({
        id: el.id,
        date: el.date,
        link: el.link,
        title: el.title && el.title.rendered,
        content: el.content && el.content.rendered,
        excerpt: el.excerpt && el.excerpt.rendered
      }))
      JSON_FULL_DATA = [...JSON_FULL_DATA, ...mappedDataArr]
    } catch (err) {
      console.error(`[loadDataInMemory] [page: ${i}] ${err}`)
    }
  }
  return JSON_FULL_DATA
}

function createPageFromObject(data) {
  let pagehtml = ''
  for (let item of data) {
    let blockhtml  = `<h2>${item.title.rendered}</h2>${item.content.rendered}</br></br>
    `
    pagehtml += blockhtml
  }
  return pagehtml
}



// Middleware to serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use(cors())

// Route to serve pages
app.get("/page/:index", async (req, res) => {
  const index = parseInt(req.params.index, 10);
  let jsonObj = await fetchJsonObjFromFile(index)
  let pageHtml = createPageFromObject(jsonObj)
  // let page = '<h1>test</h1>'
  return res.status(200).send(pageHtml)
});

app.get("/", (req, res, next) => {
  return res.status(200).sendFile(path.join(__dirname, 'index.html'))
})

app.get("/items", async (req, res) => {
  let {order, order_by, page, per_page, search} = req.query

  // calculating per_page and page
  per_page = parseInt(per_page) || 10
  page = parseInt(page) || 1

  let data = [...JSON_FULL_DATA]
  if (search) {
    data = data.filter(el => el.title.match(new RegExp(`.*${search}.*`, 'i')))
  }
  // total filtered items
  let totalFilteredItems = data.length
  let totalPages = Math.ceil(totalFilteredItems/per_page)

  let stringSorter = (a, b, isDes) => {
    if (a  < b) {
      return isDes ? 1 : -1
    }
    else if (a > b) {
      return isDes ? -1 : 1
    }
    else return 0
  }

  let dateSorter = (a,b,isDes) => {
    return isDes ? new Date(a) - new Date(b) : new Date(b) - new Date(a)
  }
  switch(order_by) {
    case 'id' :
      data = data.sort((a,b) => order === 'des' ? b.id - a.id : a.id - b.id )
      break;
    case 'title':
      data = data.sort((a,b) => stringSorter(a.title, b.title, order === 'des'))
      break;
    case 'date':
      data = data.sort((a,b) => dateSorter(a.date, b.date, order === 'des'))
      break;
    default:
      break;
  }
  
  // offsetting data for page_size
  let start = (page-1)*per_page
  let offsetData = data.splice(start, start+per_page)


  return res.status(200).json({
    items: offsetData,
    totalItems: totalFilteredItems,
    totalPages: totalPages,
    currentPage: page
  })
});

app.use((req, res, next) => {
  return res.status(404).send('<h2><center>404 Not Found</center></h2>')
})


loadDataInMemory().then((data) => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
})