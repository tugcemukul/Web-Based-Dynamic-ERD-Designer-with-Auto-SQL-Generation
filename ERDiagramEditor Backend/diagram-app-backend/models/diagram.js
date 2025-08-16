'use strict';
const { Model } = require('sequelize'); //Sequelize ORM kütüphanesinden Model sınıfı import edilir.

module.exports = (sequelize, DataTypes) => {
  class Diagram extends Model { //Diagram sınıfı tanımlanıyor, bu sınıf Model sınıfından üretildi
    static associate(models) {
      // Diagram ve Kullanıcı ilişkisi, diğer modellerle olan ilişkileri tanımlar
      Diagram.belongsTo(models.User, { foreignKey: 'userId' }); //diagram modelindeki her bir kayıt bir kullanıcıya ait olacaktır
    }
  }

  //diyagram modelinin özellikleri
  Diagram.init( //modelin veri tabanı sütunlarını ve tiplerini belirler
      {
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false }, //diyagram adı
        content: { type: DataTypes.JSON, allowNull: false }, //diyagramın içeriğini JSON formatında tutar

      },
      { sequelize, modelName: 'Diagram',
          timestamps: true} //oluşturulma ve güncellenme zamanları otomatik olarak eklenir (createdAt ve updatedAt)
  );
  return Diagram; //model dışarı aktarılıyor
};
