// ==UserScript==
// @name        Object to OneTrust personal data processing
// @match       http*://*leo.org/*
// @match       http*://*macmillandictionary.com/*
// @version     1.0.0
// @run-at      document-idle
// @description Automates the objection to personal data processing in the dialogues of the [OneTrust Preference Center](https://www.onetrust.com/products/cookie-consent). It toggles off all cookie options, objects to all legitimate interests and removes consent for all vendors.
// ==/UserScript==

main()

async function main () {
  try {
    if (!await cookieBannerLoaded()) {
      console.debug('The cookie banner has not been found.')
      return
    }

    await consentDialogueLoadedAfterOpening()
    objectToAllUses(findPurposeTabs())
    refuseAllVendors()
    findConfirmationButton().click()
  } catch (e) {
    console.error(e)
    window.alert(e)
  }
}

async function cookieBannerLoaded () {
  const elementsLoaded = await Promise.all(
      ['onetrust-banner-sdk', 'onetrust-consent-sdk'].map(id => elementLoaded(id)))
  return elementsLoaded.every(i => i)
}

function consentDialogueLoadedAfterOpening () {
  return elementLoaded('ot-pc-content', () => findConsentManagementButton().click())
}

function elementLoaded (id, actionAfterObservationStart) {
  return new Promise((resolve, reject) => {
    const observer = new window.MutationObserver(mutations => {
      if (!findAddedNodeIn(mutations, id)) {
        return
      }

      clearTimeout(disconnectionTimer)
      observer.disconnect()
      resolve(true)
    })
    const disconnectionTimer = setTimeout(
      () => {
        observer.disconnect()
        resolve(false)
      },
      10000)
    observeAllPageElements(observer)

    // TODO: check if element has been loaded. if so, clear, disconnect, resolve

    if (actionAfterObservationStart) {
      actionAfterObservationStart()
    }
  })
}

function findAddedNodeIn (pageElementMutations, nodeId) {
  return pageElementMutations
    .flatMap(mutation => Array.from(mutation.addedNodes))
    .filter(node => node.nodeType === window.Node.ELEMENT_NODE)
    .find(node => node.attributes.id?.value === nodeId)
}

function observeAllPageElements (observer) {
  observer.observe(
    document.querySelector('body'), { subtree: true, childList: true })
}

function findConsentManagementButton () {
  const button = document.getElementById('onetrust-pc-btn-handler')

  if (!button) {
    throw new Error('Button to open consent management dialogue not found.')
  }
  console.debug('Found button to open consent management dialogue.')
  return button
}

function objectToAllUses (tabs) {
  let checkboxesFound = false
  let objectionButtonsFound = false

  tabs.forEach(tab => {
    // The panels are accessible without clicking, but without doing it,
    // the OneTrust JavaScript throws an error about a missing parent
    // when trying to click on the objection buttons.
    tab.click()
    const panel = findPanelFor(tab)
    const title = findTitle(tab)

    const checkboxes = findCheckboxesIn(panel)
    if (checkboxes?.length) {
      checkboxesFound = true
      logCheckboxCount(checkboxes.length, title)

      checkboxes.forEach(uncheck)
    }
    const buttons = findObjectionButtonsIn(panel)
    if (buttons?.length) {
      objectionButtonsFound = true
      logObjectionButtonCount(buttons.length, title)

      buttons.forEach(button => button.click())
    }
  })

  if (!checkboxesFound) {
    throw new Error('No checkboxes found in any of the panels.')
  }
  if (!objectionButtonsFound) {
    throw new Error('No objection buttons found in any of the panels.')
  }
}

function findPanelFor (tab) {
  const panelId = tab.getAttribute('aria-controls')
  return document.getElementById(panelId)
}

function findTitle (tab) {
  return tab.querySelector('h3')?.innerText
}

function findCheckboxesIn (panel) {
  return panel.querySelectorAll('input[type=checkbox]')
}

function logCheckboxCount (count, panelTitle) {
  const suffix = count > 1 ? 'es' : ''
  console.debug(`Found ${count} checkbox${suffix} in panel '${panelTitle}'.`)
}

function findObjectionButtonsIn (panel) {
  return Array.from(panel.querySelectorAll('button.ot-obj-leg-btn-handler'))
    .filter(button => button.querySelector(':scope > span')?.innerText.startsWith('Object to'))
}

function logObjectionButtonCount (count, panelTitle) {
  const suffix = count > 1 ? 's' : ''
  console.debug(`Found ${count} objection button${suffix} in panel '${panelTitle}'.`)
}

function findPurposeTabs() {
  const tabs = document.querySelectorAll('#ot-pc-content div.category-menu-switch-handler')
  const amount = tabs?.length
  if (!amount) {
    throw new Error('Purpose tabs not found.')
  }

  const suffix = amount > 1 ? 's' : ''
  console.debug(`Found ${amount} purpose tab${suffix}.`)
  return tabs
}

function refuseAllVendors () {
  findVendorsListButton().click()
  
  const checkboxes = findAllVendorsConsentCheckboxes()
  checkboxes.forEach(uncheck)

  findBackToPanelButton().click()
}

function findVendorsListButton () {
  const button = document.querySelector('.category-vendors-list-handler')
  if (!button?.innerText?.includes('IAB Vendors')) {
    throw new Error('IAB vendors button not found.')
  }

  console.debug(
    'Found IAB vendors button in panel', `'${button.parentElement.querySelector('#ot-pvcy-hdr')?.innerText}'.`)
  return button
}

function uncheck (checkbox) {
  if (checkbox.checked) {
    checkbox.click()
  }
}

function findAllVendorsConsentCheckboxes () {
  const checkboxes = document.querySelectorAll('input[aria-label*="all vendors" i]')
  const amount = checkboxes?.length
  if (!amount) {
    throw new Error('No checkbox for all vendors consent found.')
  }

  const suffix = amount > 1 ? 'es' : ''
  console.debug(`Found ${amount} all vendors consent checkbox${suffix}.`)
  return checkboxes
}

function findBackToPanelButton () {
  const button = document.querySelector('#ot-lst-title > button.back-btn-handler')
  if (!button) {
    throw new Error('Button to return to panel button not found.')
  }

  console.debug('Found button to return to panel.')
  return button
}

function findConfirmationButton () {
  const button = document.querySelector('button.save-preference-btn-handler')
  if (!button?.innerText?.includes('Confirm')) {
    throw new Error('Confirmation button not found')
  }

  console.debug('Found confirmation button.')
  return button
}
