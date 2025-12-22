# Loamly Viral Launch Plan

**Goal:** 1000 GitHub stars in 30 days

## Current State
- Stars: 4
- npm downloads: Check with `npm info @loamly/tracker`
- Documentation: Good
- Code quality: Production-grade

## Critical Missing Items

### 1. Visual Demo (GIF/Video) - MUST HAVE
- [ ] Screen recording of Loamly dashboard
- [ ] Show: AI bot visiting → detection → dashboard update
- [ ] 10-15 second GIF, optimized < 5MB
- [ ] Add to README hero section

### 2. Live Playground - MUST HAVE
- [ ] Create https://demo.loamly.ai or /playground page
- [ ] Let visitors trigger detection without signup
- [ ] Show real-time detection happening
- [ ] "Try it now" button in README

### 3. Example Projects
- [ ] `examples/nextjs-app/` - Next.js integration
- [ ] `examples/cloudflare-worker/` - Edge detection
- [ ] `examples/react-spa/` - React SPA with tracker

### 4. Social Proof
- [ ] Add testimonial quotes to README
- [ ] "Used by" section with logos (even if early stage)
- [ ] Twitter/X announcement thread ready

### 5. Launch Sequence

#### Week 1: Pre-Launch
- [ ] Enable GitHub Discussions
- [ ] Create Twitter/X announcement thread (don't post yet)
- [ ] Prepare HN post title and description
- [ ] Reach out to 5-10 potential early adopters

#### Week 2: Soft Launch
- [ ] Post on Twitter/X
- [ ] Share in relevant Discord servers (Next.js, Vercel, etc.)
- [ ] Post on r/webdev, r/javascript
- [ ] Collect initial feedback

#### Week 3: Hacker News Launch
- [ ] Optimal timing: Tuesday-Thursday, 6-9am PT
- [ ] Title format: "Show HN: Loamly – See when AI bots visit your website (open source)"
- [ ] Be available to answer comments for 24 hours
- [ ] Cross-post to Twitter when HN traction builds

#### Week 4: Amplification
- [ ] Product Hunt launch
- [ ] Dev.to article: "How we built open-source AI traffic detection"
- [ ] YouTube/Loom walkthrough video
- [ ] Reach out to newsletters (TLDR, Changelog, etc.)

## HN Post Template

```
Title: Show HN: Loamly – See when AI bots visit your website (open source)

Body:
Hey HN, I built Loamly because 75-85% of AI-referred traffic is invisible to analytics.

When users copy URLs from ChatGPT or Perplexity, there's no referrer, no UTM. It shows up as "Direct Traffic" in GA.

Loamly uses RFC 9421 cryptographic signatures (the same standard OpenAI uses for ChatGPT Agent Mode) to detect this traffic with 100% accuracy.

For traffic without signatures (copy-paste), we use 5 different detection methods:
- Navigation Timing API (paste = instant navigation)
- Focus/Blur sequence analysis
- Behavioral ML classification
- Agentic browser detection (CDP, Perplexity Comet)

Two packages:
- @loamly/edge: Cloudflare Worker for server-side detection
- @loamly/tracker: Client-side tracker (11KB gzipped)

Everything is MIT licensed. Would love feedback on the approach!

GitHub: https://github.com/loamly/loamly
Demo: https://demo.loamly.ai
```

## Success Metrics

| Day | Target Stars | How |
|-----|-------------|-----|
| 0 (now) | 4 | Current |
| 7 | 50 | Friends, early adopters |
| 14 | 150 | Reddit, Discord, Twitter |
| 21 | 500 | HN launch |
| 30 | 1000 | HN + PH + amplification |

## Reality Check

Viral repos that hit 1000 stars in a month typically have:
1. **Visual proof** (GIF showing it works)
2. **Try before install** (playground)
3. **Perfect timing** (HN launch)
4. **Founder engagement** (responding to every comment)
5. **Novelty** (solving a new problem)

You have #5. You need #1-4.

## References

- [How to get GitHub stars](https://dev.to/github/how-to-get-more-stars-on-github-2je9)
- [HN virality research](https://arxiv.org/html/2511.04453v1)
- [Open source marketing](https://www.heavybit.com/library/video/open-source-marketing)

