import React, { useEffect, useState } from "react";

const Overlay = () => {
	const [tipStatus, setTipStatus] = useState(null);

	useEffect(() => {
		if (!globalThis.chrome?.runtime?.onMessage) {
			return undefined;
		}

		const listener = (msg) => {
			if (msg?.type === "TIP_TRIGGERED") {
				setTipStatus(msg.payload);
				setTimeout(() => setTipStatus(null), 3000);
			}
		};

		chrome.runtime.onMessage.addListener(listener);

		return () => {
			chrome.runtime.onMessage.removeListener(listener);
		};
	}, []);

	return tipStatus ? (
		<div className="overlay-toast" role="status" aria-live="polite">
			{`Tipped ${tipStatus.amount} ${tipStatus.token} to ${tipStatus.creator} on ${tipStatus.platform}`}
		</div>
	) : null;
};

export default Overlay;
