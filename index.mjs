import express from 'express'
import cors from 'cors'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import fs from 'fs'

puppeteer.use(StealthPlugin())

const app = express()
app.use(cors())

app.get('/product', async (req, res) => {
  const url = decodeURIComponent(req.query.url)
  if (!url) return res.status(400).json({ error: 'Missing URL' })

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()

  try {
    console.log('📦 โหลดลิงก์...')
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })

    // ✅ เซฟ HTML เผื่อ debug
    const html = await page.content()
    fs.writeFileSync('page.html', html)
    console.log('✅ เซฟ HTML เป็น page.html แล้วครับ')

    const data = await page.evaluate(() => {
      const getText = (selector) =>
        document.querySelector(selector)?.innerText?.trim() || null

      const name =
        getText('h1') ||
        getText('div.title') ||
        getText('title') ||
        'ไม่พบชื่อสินค้า'

      const priceText =
        getText('span[class*="text--"]') ||
        getText('.price') ||
        getText('.origin-price') || '0'

      const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0

      const image =
        document.querySelector('img.QJEEHAN8H5--thumbnailPic--_2b4183e')?.src ||
        document.querySelector('img')?.src || ''

      return {
        name,
        price_yuan: price,
        price_thb: Math.round(price * 5.5),
        image_url: image,
      }
    })

    await browser.close()
    res.json(data)
  } catch (e) {
    await browser.close()
    res.status(500).json({
      error: 'Failed to fetch product data',
      message: e.message,
    })
  }
})

app.listen(3000, () => {
  console.log('✅ API พร้อมใช้งานที่ http://localhost:3000')
}) 