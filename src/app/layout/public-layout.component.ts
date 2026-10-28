import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-public-layout',
  standalone: true,
  styleUrl: './public-layout.component.css',
  templateUrl: './public-layout.component.html',
})
export class PublicLayoutComponent {}
