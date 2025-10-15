// Sistema de pilha de modais para controlar qual modal está no topo
class ModalStack {
  private stack: string[] = [];

  push(modalId: string) {
    // Remove se já existir (para evitar duplicatas)
    this.remove(modalId);
    this.stack.push(modalId);
  }

  remove(modalId: string) {
    this.stack = this.stack.filter(id => id !== modalId);
  }

  getTop(): string | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  isTop(modalId: string): boolean {
    return this.getTop() === modalId;
  }

  clear() {
    this.stack = [];
  }

  getStack(): string[] {
    return [...this.stack];
  }
}

export const modalStack = new ModalStack();

