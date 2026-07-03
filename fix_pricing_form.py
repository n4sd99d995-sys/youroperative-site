#!/usr/bin/env python3
"""
Fix youroperative.com:
1. Make pricing cards clickable → scroll to CTA section
2. Add email field to contact forms
3. Convert trade-page fake forms to real Netlify form submissions
"""
import re, os

WEBSITE_DIR = os.path.dirname(os.path.abspath(__file__))

# ─── Pricing card click snippet (injected before </body>) ────────────────────
def card_click_script(target_id):
    return f"""
<script>
// Pricing cards → scroll to CTA
document.querySelectorAll('.pricing-card').forEach(function(card) {{
  card.style.cursor = 'pointer';
  card.addEventListener('click', function(e) {{
    if (!e.target.closest('a, button')) {{
      var target = document.getElementById('{target_id}');
      if (target) target.scrollIntoView({{behavior: 'smooth'}});
    }}
  }});
}});
</script>
"""

# ─── index.html ──────────────────────────────────────────────────────────────
def fix_index():
    path = os.path.join(WEBSITE_DIR, 'index.html')
    with open(path) as f:
        html = f.read()

    # 1. Add email input to contact form (after phone, before honeypot)
    old_form = (
        '                    <input type="text" name="name" placeholder="Name" required>\n'
        '                    <input type="text" name="company" placeholder="Company">\n'
        '                    <input type="tel" name="phone" placeholder="Phone" required>\n'
        '                    <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">'
    )
    new_form = (
        '                    <input type="text" name="name" placeholder="Name" required>\n'
        '                    <input type="text" name="company" placeholder="Company">\n'
        '                    <input type="tel" name="phone" placeholder="Phone" required>\n'
        '                    <input type="email" name="email" placeholder="Email">\n'
        '                    <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">'
    )
    if old_form in html:
        html = html.replace(old_form, new_form)
        print('index.html: ✓ email field added')
    else:
        print('index.html: ⚠ email field pattern not found — check manually')

    # 2. Add pricing card click script before </body>
    script = card_click_script('contact')
    if 'pricing-card click' not in html.lower() and 'scrollIntoView' not in html:
        html = html.replace('</body>', script + '</body>')
        print('index.html: ✓ pricing card click script added')
    else:
        print('index.html: pricing card script already present, skipping')

    with open(path, 'w') as f:
        f.write(html)

# ─── Trade pages ─────────────────────────────────────────────────────────────
TRADE_PAGES = ['plumbing', 'hvac', 'electrical', 'roofing', 'landscaping', 'masonry']

# Old fake form (2 variants depending on indentation)
OLD_FORM_A = (
    '        <div class="contact-form">\n'
    '            <input type="text" class="fld" placeholder="Name">\n'
    '            <input type="text" class="fld" placeholder="Company">\n'
    '            <input type="text" class="fld" placeholder="Phone">\n'
    '            <a href="#" class="btn-gold">Send it &rarr;</a>\n'
    '        </div>'
)

NEW_FORM_A = (
    '        <form class="contact-form" method="POST" action="/.netlify/functions/contact">\n'
    '            <input type="text" class="fld" name="name" placeholder="Name" required>\n'
    '            <input type="text" class="fld" name="company" placeholder="Company">\n'
    '            <input type="tel" class="fld" name="phone" placeholder="Phone" required>\n'
    '            <input type="email" class="fld" name="email" placeholder="Email">\n'
    '            <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">\n'
    '            <button type="submit" class="btn-gold">Send it &rarr;</button>\n'
    '        </form>'
)

def fix_trade_page(name):
    path = os.path.join(WEBSITE_DIR, f'{name}.html')
    with open(path) as f:
        html = f.read()

    changed = False

    # 1. Fix form
    if OLD_FORM_A in html:
        html = html.replace(OLD_FORM_A, NEW_FORM_A)
        print(f'{name}.html: ✓ form converted + email added')
        changed = True
    else:
        # Try to find and report what's there
        if 'contact-form' in html and '<a href="#" class="btn-gold">' in html:
            print(f'{name}.html: ⚠ form pattern slightly different — check manually')
        elif 'email' in html and 'name="email"' in html:
            print(f'{name}.html: email field already present')
        else:
            print(f'{name}.html: ⚠ form not matched — inspect')

    # 2. Add pricing card click script
    if 'scrollIntoView' not in html:
        script = card_click_script('cta')
        html = html.replace('</body>', script + '</body>')
        print(f'{name}.html: ✓ pricing card click script added')
        changed = True
    else:
        print(f'{name}.html: pricing card script already present')

    if changed:
        with open(path, 'w') as f:
            f.write(html)

if __name__ == '__main__':
    print('=== Fixing index.html ===')
    fix_index()
    print()
    print('=== Fixing trade pages ===')
    for trade in TRADE_PAGES:
        fix_trade_page(trade)
    print()
    print('Done.')
