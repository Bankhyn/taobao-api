// index.mjs (ESM Module)

import express from 'express'
import cors from 'cors'
import fs from 'fs'
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteerExtra.use(StealthPlugin())

const app = express()
app.use(cors())

function cleanUrl(url) {
  const match = url.match(/https:\/\/(detail|item)\.(taobao|tmall|1688)\.com\/[^"\s]+/)
  return match ? match[0] : null
}

app.get('/product', async (req, res) => {
  const rawUrl = decodeURIComponent(req.query.url || '')
  const url = cleanUrl(rawUrl)
  if (!url) return res.status(400).json({ error: 'URL ไม่ถูกต้อง' })

  console.log('🌀 โหลดลิงก์...', url)
  const browser = await puppeteerExtra.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await new Promise(resolve => setTimeout(resolve, 3000))

    const html = await page.content()
    fs.writeFileSync('page.html', html)
    console.log('✅ เซฟ HTML แล้ว')

    const data = await page.evaluate(() => {
      const getText = (selector) => document.querySelector(selector)?.innerText?.trim()

      const name =
        getText('div[class^="title"] > h1') ||
        getText('#J_Title .tb-main-title') ||
        getText('.tb-detail-hd h1') ||
        getText('h1') ||
        getText('title') || 'ไม่พบชื่อสินค้า'

      const priceText =
        getText('span[class*="--text--"]') ||
        getText('.price .priceContent .price') ||
        getText('.tb-rmb-num') ||
        getText('.price') ||
        getText('.origin-price') || '0'

      const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0

      const image =
        document.querySelector('#J_UlThumb img')?.src ||
        document.querySelector('.tb-gallery img')?.src ||
        document.querySelector('img')?.src || ''

      return {
        name,
        price_yuan: price,
        price_thb: Math.round(price * 5.5),
        image_url: image.startsWith('//') ? 'https:' + image : image,
      }
    })

    await browser.close()
    res.json(data)
  } catch (e) {
    await browser.close()
    console.error('❌ ERROR:', e.message)
    res.status(500).json({ error: 'ดึงข้อมูลไม่ได้', message: e.message })
  }
})

app.listen(3000, () => {
  console.log('🚀 API พร้อมใช้ที่ http://localhost:3000')
})
