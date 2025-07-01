# 🍷 Wine Automation Setup Checklist

## ✅ **Completed**
- [x] MCP tools configured (Firecrawl, Perplexity, DataForSEO)
- [x] Automation scripts created
- [x] npm commands configured
- [x] Astro project structure ready
- [x] Supabase database setup
- [x] Environment variables configured
- [x] Daily automation working
- [x] Content generation pipeline active

## 🔄 **Still Needed**

### **1. DataForSEO API Credentials (PRIORITY)**
- [ ] Get DataForSEO account (already configured)
- [ ] Get login credentials (username + password)
- [ ] Test API connection

### **2. Supabase Database Setup**
- [ ] Create account at [supabase.com](https://supabase.com)
- [ ] Create new project
- [ ] Run SQL schema (see `supabase-schema.sql`)
- [ ] Get project URL and anon key from Settings > API

### **3. Environment Variables**
Create `.env` file in project root with:
```env
# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# DataForSEO (Required for automation)
DATAFORSEO_LOGIN=your_username
DATAFORSEO_PASSWORD=your_password

# Optional (already configured in MCP)
PERPLEXITY_API_KEY=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
FIRECRAWL_API_KEY=fc-990a774838074a5eae8eac23a9297947
```

### **4. Test Everything**
Run these commands to verify setup:
```bash
# Test Supabase connection
npm run test:supabase

# Test keyword research pipeline  
npm run wine:keywords

# Test daily automation
npm run wine:daily

# Test full workflow
npm run wine:workflow
```

### **5. First Content Generation**
```bash
# Generate your first 5 wine pages
npm run wine:workflow

# Build and preview
npm run build
npm run preview

# Check results at http://localhost:4321/wine-pairings/
```

---

## 🚀 **Getting Started Steps**

### **Step 1: DataForSEO Setup (10 minutes)**
1. Go to [dataforseo.com](https://dataforseo.com)
2. Sign up for API access
3. Choose the "Starter" plan (~$100/month)
4. Get your login credentials
5. Test with one API call

### **Step 2: Supabase Setup (15 minutes)**
1. Create account at [supabase.com](https://supabase.com)
2. Create new project (choose a region close to you)
3. Go to SQL Editor → New Query
4. Copy and run the SQL from `supabase-schema.sql`
5. Go to Settings → API → copy your URL and anon key

### **Step 3: Environment Variables (5 minutes)**
1. Create `.env` file in project root
2. Add all the variables listed above
3. Save the file (it's in .gitignore so won't be committed)

### **Step 4: Test Run (5 minutes)**
```bash
npm run test:supabase    # Should connect successfully
npm run wine:keywords    # Should find wine keywords
npm run wine:daily       # Should generate 5 pages
```

### **Step 5: First Deploy (10 minutes)**
```bash
npm run build           # Build the site
npm run preview        # Preview locally
# Check /wine-pairings/ for generated content
```

---

## 💡 **Pro Tips**

### **DataForSEO Cost Optimization**
- Start with lowest tier ($50/month)
- Monitor usage in dashboard
- Scale up as content production increases

### **Supabase Free Tier**
- Free tier includes 500MB database
- 50,000 monthly active users
- Perfect for getting started

### **Testing Without Real APIs**
- Scripts have mock data for testing
- Can generate sample content immediately
- Add real APIs when ready to scale

---

## 🔧 **Troubleshooting**

### **If `npm run test:supabase` fails:**
- Check your SUPABASE_URL format (should include https://)
- Verify anon key is correct (long string starting with 'eyJ')
- Make sure tables are created in Supabase

### **If `npm run wine:keywords` fails:**
- Check DataForSEO credentials in .env
- Verify account has API access enabled
- Test with DataForSEO dashboard first

### **If pages aren't generating:**
- Check file permissions on src/pages/wine-pairings/
- Verify Astro development server isn't running
- Review error logs in terminal

---

## 📈 **Next Steps After Setup**

1. **Week 1**: Generate 25 pages, verify Google indexing
2. **Week 2**: Set up analytics, email capture
3. **Week 3**: Add affiliate links, price monitoring
4. **Week 4**: Scale to full automation (5 pages/day)

Your wine content empire awaits! 🍷 