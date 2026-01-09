const notifyBackground = (type, details) =>
    new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type, details }, (response) => {
            const runtimeError = chrome.runtime.lastError
            if (runtimeError) {
                reject(new Error(runtimeError.message))
                return
            }

            resolve(response)
        })
    })

    ; (async () => {
        try {
            const { isMeetPage } = await import(chrome.runtime.getURL('utils/meetDetector.js'))
            const currentUrl = window.location.href

            if (!isMeetPage(currentUrl)) {
                return
            }

            console.log('[Extension] Google Meet detected')
            let teardownCalled = false

            notifyBackground('MEETING_STARTED', { meetUrl: currentUrl }).catch((error) => {
                console.error('[Extension] Failed to start meeting session', error)
            })

            const teardown = () => {
                if (teardownCalled) {
                    return
                }
                teardownCalled = true
                notifyBackground('MEETING_ENDED', { reason: 'PAGE_EXIT' }).catch((error) =>
                    console.error('[Extension] Failed to end meeting session', error)
                )
            }

            window.addEventListener('pagehide', teardown, { once: true })
            window.addEventListener('beforeunload', teardown, { once: true })
        } catch (error) {
            console.error('[Extension] Failed to evaluate Meet context', error)
        }
    })()