import { getModalContentTopOffset } from './DraggableModal';

describe('getModalContentTopOffset', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('usa a base do .layout-header-stack mais a margem', () => {
    const stack = document.createElement('div');
    stack.className = 'layout-header-stack';
    document.body.appendChild(stack);
    jest.spyOn(stack, 'getBoundingClientRect').mockReturnValue({
      bottom: 120,
      top: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 120,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    expect(getModalContentTopOffset()).toBe(128);
  });

  it('usa fallback quando o header não está no DOM', () => {
    expect(getModalContentTopOffset()).toBe(96);
  });
});
