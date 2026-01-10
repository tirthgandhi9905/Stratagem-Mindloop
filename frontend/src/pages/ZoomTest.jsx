import { useState, useCallback, useEffect } from "react";
import { ZoomMtg } from "@zoom/meetingsdk";
import "@zoom/meetingsdk/dist/ui/zoom-meetingsdk.css";
import { authedRequest } from "../services/orgApi";

// Use Zoom's official CDN for library files - this is the recommended approach
// for Client View to avoid Invalid URL errors with self-hosted files
const ZOOM_SDK_VERSION = "5.0.4";
ZoomMtg.setZoomJSLib(`https://source.zoom.us/${ZOOM_SDK_VERSION}/lib`, "/av");
ZoomMtg.preLoadWasm();
ZoomMtg.prepareWebSDK();

console.log("Zoom SDK loaded from CDN");

const ZoomTest = () => {
	const [meetingNumber, setMeetingNumber] = useState("");
	const [passcode, setPasscode] = useState("");
	const [userName, setUserName] = useState("Zoom Tester");
	const [status, setStatus] = useState("");
	const [error, setError] = useState("");
	const [isMeetingActive, setIsMeetingActive] = useState(false);

	// Toggle body class for Zoom visibility
	useEffect(() => {
		if (isMeetingActive) {
			document.body.classList.add("zoom-active");
		} else {
			document.body.classList.remove("zoom-active");
		}
	}, [isMeetingActive]);

	const openAudioControlPanel = useCallback(() => {
		window.open("/audio-control", "_blank", "width=400,height=500");
	}, []);

	const handleJoin = useCallback(async (e) => {
		e.preventDefault();
		setStatus("Getting signature...");
		setError("");

		// We set meeting active true to signal our CSS to show the root
		setIsMeetingActive(true);

		try {
			// 1. Get Signature from backend
			const signatureData = await authedRequest("/zoom/sdk/signature", {
				method: "POST",
				body: JSON.stringify({
					meetingNumber: meetingNumber,
					role: 0,
				}),
			});

			const signature = signatureData.signature;
			const sdkKey = import.meta.env.VITE_ZOOM_SDK_KEY;

			if (!signature) throw new Error("No signature received from backend");
			if (!sdkKey) throw new Error("VITE_ZOOM_SDK_KEY is missing");

			setStatus("Initializing Zoom SDK...");

			// 2. Initialize Zoom SDK
			ZoomMtg.init({
				leaveUrl: window.location.href,
				success: (success) => {
					console.log("ZoomMtg init success", success);
					setStatus("Joining meeting...");

					// 3. Join Meeting
					ZoomMtg.join({
						signature: signature,
						meetingNumber: meetingNumber,
						passWord: passcode,
						userName: userName,
						success: (success) => {
							console.log("ZoomMtg join success", success);
							setStatus("Joined!");
						},
						error: (error) => {
							console.error("ZoomMtg join error", error);
							setError(error.message);
							setStatus("Join failed");
							setIsMeetingActive(false);
						},
					});
				},
				error: (error) => {
					console.error("ZoomMtg init error", error);
					setError(error.message);
					setStatus("Init failed");
					setIsMeetingActive(false);
				},
			});
		} catch (err) {
			console.error("Error in join flow:", err);
			setError(err.message || "Unknown error occurred");
			setStatus("Error");
			setIsMeetingActive(false);
		}
	}, [meetingNumber, passcode, userName]);

	return (
		<div className="relative font-sans text-gray-900">
			{/* 
        Force Zoom root to be hidden by default using !important to override SDK styles. 
        Only when 'zoom-active' class is on body do we show it. 
      */}
			<style>{`
        #zmmtg-root {
          display: none !important;
        }
        body.zoom-active #zmmtg-root {
          display: block !important;
        }
      `}</style>

			{!isMeetingActive && (
				<div className="container mx-auto p-8 max-w-lg">
					<h1 className="text-2xl font-bold mb-6">Zoom Meeting SDK Test</h1>

					<form onSubmit={handleJoin} className="flex flex-col gap-4">
						<div>
							<label className="block text-sm font-medium mb-1">Meeting Number</label>
							<input
								type="text"
								className="w-full p-2 border rounded"
								value={meetingNumber}
								onChange={(e) => setMeetingNumber(e.target.value)}
								placeholder="1234567890"
								required
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">Passcode</label>
							<input
								type="text"
								className="w-full p-2 border rounded"
								value={passcode}
								onChange={(e) => setPasscode(e.target.value)}
								placeholder="Optional"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1">Display Name</label>
							<input
								type="text"
								className="w-full p-2 border rounded"
								value={userName}
								onChange={(e) => setUserName(e.target.value)}
							/>
						</div>

						<button
							type="submit"
							className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 font-bold"
						>
							Join Meeting
						</button>
					</form>

					{/* Audio Control Panel Button */}
					<div className="mt-6 p-4 border rounded-lg bg-gray-50">
						<h2 className="text-lg font-semibold mb-2">Audio Capture</h2>
						<p className="text-sm text-gray-600 mb-3">
							Open a separate window to capture and monitor audio from the Zoom meeting tab.
						</p>
						<button
							onClick={openAudioControlPanel}
							className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 font-bold"
						>
							Open Audio Control Panel
						</button>
					</div>

					{status && <div className="mt-4 p-2 bg-gray-100 rounded">Status: {status}</div>}
					{error && <div className="mt-2 p-2 bg-red-100 text-red-700 rounded">Error: {error}</div>}
				</div>
			)}
		</div>
	);
};

export default ZoomTest;