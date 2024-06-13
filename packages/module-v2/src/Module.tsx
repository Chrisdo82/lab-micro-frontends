import React from 'react';
import { useState } from 'react';
import { KolButton, KolLinkGroup } from '@public-ui/react';
import { NotificationProvider, useNotifications } from './Notification';

export default () => {
	return (
		<NotificationProvider>
			<App />
		</NotificationProvider>
	);
};

const App = () => {
	const [counter, setCounter] = useState(0);
	const { addNotification } = useNotifications();

	return (
		<div>
			<h2>V2 micro frontend</h2>

			<KolButton
				_label={`KolButton ${counter}`}
				_on={{
					onClick: () => {
						addNotification({ type: 'info', message: `KolButton ${counter} clicked`, headline: 'KolButton clicked' });
						setCounter(counter + 1);
					},
				}}
			/>

			<KolLinkGroup _label="Link Group" _links={[{ _label: 'One link', _href: 'https://example.com' }]}></KolLinkGroup>
		</div>
	);
};
