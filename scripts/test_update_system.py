#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de test du système de mise à jour
Compatible Python 3.6+
"""

import sys
import os

# Ajouter le chemin vers le module updater
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_version_checker():
    """Test du module version_checker"""
    print("=" * 70)
    print("TEST DU MODULE VERSION_CHECKER")
    print("=" * 70)
    print()
    
    try:
        from updater import check_for_updates, get_current_version, compare_versions
        print("✅ Import du module updater réussi")
        print()
        
        # Test 1: Lire la version actuelle
        print("🔍 Test 1: Lecture de la version actuelle")
        print("-" * 70)
        current_version = get_current_version()
        print(f"   Version actuelle: {current_version}")
        print()
        
        # Test 2: Comparaison de versions
        print("🔍 Test 2: Comparaison de versions")
        print("-" * 70)
        test_cases = [
            ("2.0.0", "2.1.0", -1, "2.0.0 < 2.1.0"),
            ("2.1.0", "2.1.0", 0, "2.1.0 == 2.1.0"),
            ("2.2.0", "2.1.0", 1, "2.2.0 > 2.1.0"),
            ("1.9.9", "2.0.0", -1, "1.9.9 < 2.0.0"),
        ]
        
        all_passed = True
        for v1, v2, expected, desc in test_cases:
            result = compare_versions(v1, v2)
            status = "✅" if result == expected else "❌"
            all_passed = all_passed and (result == expected)
            print(f"   {status} {desc} → {result} (attendu: {expected})")
        
        print()
        if all_passed:
            print("✅ Tous les tests de comparaison ont réussi")
        else:
            print("❌ Certains tests ont échoué")
        print()
        
        # Test 3: Vérification des mises à jour
        print("🔍 Test 3: Vérification des mises à jour sur GitHub")
        print("-" * 70)
        print("   Tentative de connexion à GitHub...")
        print()
        
        result = check_for_updates()
        
        if result is None:
            print("   ⚠️  Impossible de vérifier (pas de connexion ou erreur)")
        elif result.get('available'):
            print("   🎉 MISE À JOUR DISPONIBLE!")
            print(f"   📦 Version actuelle: {result.get('current_version')}")
            print(f"   📦 Dernière version: {result.get('latest_version')}")
            if result.get('download_url'):
                print(f"   📥 Téléchargement: {result.get('download_url')}")
            if result.get('release_notes'):
                notes = result.get('release_notes')[:150]
                print(f"   📝 Notes: {notes}...")
        else:
            print("   ✅ Vous avez la dernière version")
            print(f"   📦 Version: {result.get('current_version')}")
        
        print()
        print("=" * 70)
        print("✅ TOUS LES TESTS ONT ÉTÉ EXÉCUTÉS")
        print("=" * 70)
        
        return True
        
    except ImportError as e:
        print(f"❌ Erreur d'import: {e}")
        print()
        print("💡 Vérifiez que:")
        print("   - Le dossier src/updater/ existe")
        print("   - Le fichier __init__.py est présent")
        print("   - Le fichier version_checker.py est présent")
        return False
    
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print()
    print("╔" + "=" * 68 + "╗")
    print("║" + " " * 15 + "TEST DU SYSTÈME AUTO-UPDATE" + " " * 25 + "║")
    print("╚" + "=" * 68 + "╝")
    print()
    
    success = test_version_checker()
    
    print()
    if success:
        print("🎉 Tests terminés avec succès!")
        sys.exit(0)
    else:
        print("❌ Des erreurs ont été détectées")
        sys.exit(1)
