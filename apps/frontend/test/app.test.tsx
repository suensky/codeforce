import { render } from '@testing-library/react';
import React from 'react';
import App from '../src/pages/App';

describe('App', () => {
  it('renders', () => {
    const { getByText } = render(<App />);
    expect(getByText('Codeforce Metrics')).toBeTruthy();
  });
});
